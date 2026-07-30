const Query    = require("../models/Query");
const Progress = require("../models/Progress");
const { findAnswer }  = require("../utils/aiEngine");
const { matchTopic }  = require("../utils/matcher");
const Topic           = require("../models/Topic");
const {
  parseRecurrence,
  solveMasterTheorem,
  getComplexity,
} = require("../utils/mathSolver");
const {
  buildMathResponse,
  buildComplexityResponse,
  buildConceptualResponse,
  buildProceduralResponse,
  buildExampleResponse,
  buildComparativeResponse,
} = require("../utils/responseBuilder");
const { logUnknownQuery } = require("../utils/selfLearning");
const { expandSynonyms }  = require("../utils/synonyms");

// ─────────────────────────────────────────────────────────────────
// 1. DOMAIN KEYWORDS
// ─────────────────────────────────────────────────────────────────
const AOA_KEYWORDS = [
  "sort","search","algorithm","graph","tree","heap","queue",
  "complexity","big o","recurrence","merge","quick","bubble",
  "binary","dijkstra","bellman","bfs","dfs","dp","dynamic",
  "greedy","huffman","kruskal","prim","topolog","spanning",
  "insertion","counting","radix","bucket","lcs","knapsack",
  "red-black","strassen","matrix","asymptot","theta","omega",
  "master","recursion","divide","conquer","notation","traversal",
  "inorder","preorder","postorder","median","selection","hashing",
  "loop invariant","pseudocode","time complexity","space complexity",
  "best case","worst case","average case","amortized","analysis",
  "lower bound","upper bound","tight bound","priority queue",
];

const isAoA = (q) => {
  const lower = q.toLowerCase();
  return AOA_KEYWORDS.some(k => lower.includes(k));
};

// ─────────────────────────────────────────────────────────────────
// 2. TYPO NORMALIZATION
// ─────────────────────────────────────────────────────────────────
const CORRECTIONS = {
  // Fused algorithm names
  "mergesort":          "merge sort",
  "quicksort":          "quick sort",
  "heapsort":           "heap sort",
  "bubblesort":         "bubble sort",
  "selectionsort":      "selection sort",
  "insertionsort":      "insertion sort",
  "countingsort":       "counting sort",
  "radixsort":          "radix sort",
  "bucketsort":         "bucket sort",
  "binarysearch":       "binary search",
  "dynamicprogramming": "dynamic programming",
  "bellmanford":        "bellman ford",
  // Common typos
  "insrtion":   "insertion", "insersion":  "insertion",
  "inserion":   "insertion", "insetion":   "insertion",
  "insrton":    "insertion", "inserton":   "insertion",
  "mege":       "merge",     "mrge":       "merge",
  "quik":       "quick",     "quck":       "quick",
  "quickk":     "quick",     "quicck":     "quick",
  "gredy":      "greedy",    "greede":     "greedy",
  "dynmic":     "dynamic",   "dynamc":     "dynamic",
  "progrmming": "programming","algorithmn": "algorithm",
  "algortihm":  "algorithm", "algoritm":   "algorithm",
  "algirithm":  "algorithm", "algorhtm":   "algorithm",
  "compexity":  "complexity","complxity":  "complexity",
  "complexty":  "complexity","complexit":  "complexity",
  "recurrece":  "recurrence","recurence":  "recurrence",
  "recurrnce":  "recurrence","recurrenc":  "recurrence",
  "assymptotic":"asymptotic","asymtotic":  "asymptotic",
  "asymptotoc": "asymptotic","asymptoic":  "asymptotic",
  "dijkstras":  "dijkstra",  "dijkstrs":   "dijkstra",
  "dikjstra":   "dijkstra",  "dijsktra":   "dijkstra",
  "sortiing":   "sorting",   "sortng":     "sorting",
  "traveral":   "traversal", "traversl":   "traversal",
  "seach":      "search",    "serach":     "search",
  "exampel":    "example",   "exampl":     "example",
  "exampe":     "example",   "eample":     "example",
  "exmaple":    "example",   "exapmle":    "example",
  "procdure":   "procedure", "procedue":   "procedure",
  "psuedocode": "pseudocode","pseudocde":  "pseudocode",
  "pseudcode":  "pseudocode",
};

// Simple Levenshtein for short strings (used by fuzzyCorrect)
const editDist = (a, b) => {
  if (Math.abs(a.length - b.length) > 3) return 999;
  const m = a.length, n = b.length;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1]
        ? row[j - 1]
        : 1 + Math.min(row[j], prev, row[j - 1]);
      row[j - 1] = prev;
      prev = val;
    }
    row[n] = prev;
  }
  return row[n];
};

// Vocabulary for fuzzy correction
const FUZZY_VOCAB = [
  "insertion","merge","quick","heap","bubble","selection",
  "counting","radix","bucket","binary","search","sort","sorting",
  "dijkstra","bellman","graph","tree","greedy","dynamic",
  "programming","algorithm","complexity","asymptotic","recurrence",
  "traversal","pseudocode","example","procedure","compare",
];

const normalizeQuery = (raw) => {
  let q = raw.toLowerCase().trim();

  // Apply exact corrections first
  for (const [typo, correct] of Object.entries(CORRECTIONS)) {
    const re = new RegExp(`\\b${typo}\\b`, "gi");
    q = q.replace(re, correct);
  }

  // Fuzzy-correct individual unknown words (length ≥ 5, not already correct)
  const words = q.split(/\s+/);
  const fixed = words.map(word => {
    if (word.length < 5) return word;
    if (FUZZY_VOCAB.includes(word)) return word;
    // find closest vocab word within edit distance 2
    let best = null, bestDist = 3; // threshold = 2 (strict < 3)
    for (const vocab of FUZZY_VOCAB) {
      if (Math.abs(word.length - vocab.length) > 2) continue;
      const d = editDist(word, vocab);
      if (d < bestDist) { best = vocab; bestDist = d; }
    }
    return best || word;
  });
  return fixed.join(" ");
};

// ─────────────────────────────────────────────────────────────────
// 3. INTENT DETECTION  (order matters — first match wins)
// ─────────────────────────────────────────────────────────────────
const detectIntent = (q) => {
  const lower = q.toLowerCase();

  if (/\bvs\.?\b|\bversus\b|\bcompare\b|\bdifference between\b|\bwhich is (faster|better|slower|worse)\b/.test(lower))
    return "comparative";

  if (/t\s*\(n\)|recurrence|master theorem|master method|substitution method|recursion tree/.test(lower))
    return "mathematical";

  if (/\bcomplexity\b|big[\s\-]?o\b|big[\s\-]?omega|big[\s\-]?theta|time complexity|space complexity|how (fast|slow)|worst case|best case|average case|asymptotic|running time/.test(lower))
    return "complexity";

  if (/\bexamples?\b|\btrace\b|\bwalkthrough\b|\bshow me\b|\bdemonstrat|\billustrat|\bsample\b|\bstep.?by.?step\b/.test(lower))
    return "example";

  if (/how does|how do|how to|how can|\bsteps?\b|\bpseudocode\b|\bimplement\b|\bwrite\b|\bcode\b|\bwork(s)?\b|\bprocedure\b/.test(lower))
    return "procedural";

  if (/what is|what are|\bdefine\b|\bexplain\b|\bdescribe\b|\bmeaning\b|\bdefinition\b|\boverview\b|\btell me\b/.test(lower))
    return "conceptual";

  return "conceptual";
};

// ─────────────────────────────────────────────────────────────────
// 4. TOPIC EXTRACTION
// ─────────────────────────────────────────────────────────────────
const TOPIC_MAP = [
  // Must check longer/more-specific phrases first
  ["binary search tree", "Binary Search Trees"],
  ["binary search trees","Binary Search Trees"],
  ["bst",               "Binary Search Trees"],
  ["red-black tree",    "Red-Black Trees"],
  ["red black tree",    "Red-Black Trees"],
  ["red-black",         "Red-Black Trees"],
  ["red black",         "Red-Black Trees"],
  ["minimum spanning tree", "Minimum Spanning Tree"],
  ["minimum spanning",  "Minimum Spanning Tree"],
  ["divide and conquer","Divide and Conquer"],
  ["dynamic programming","Dynamic Programming"],
  ["insertion sort",    "Insertion Sort"],
  ["merge sort",        "Merge Sort"],
  ["quick sort",        "Quick Sort"],
  ["heap sort",         "Heap Sort"],
  ["bubble sort",       "Bubble Sort"],
  ["selection sort",    "Selection Sort"],
  ["counting sort",     "Counting Sort"],
  ["radix sort",        "Radix Sort"],
  ["bucket sort",       "Bucket Sort"],
  ["binary search",     "Binary Search"],
  ["activity selection","Greedy Algorithms"],
  ["master theorem",    "Master Theorem"],
  ["recursion tree",    "Master Theorem"],
  ["substitution method","Master Theorem"],
  ["topological sort",  "Topological Sort"],
  ["topological",       "Topological Sort"],
  ["order statistics",  "Medians and Order Statistics"],
  ["priority queue",    "Priority Queue"],
  ["dijkstra",          "Dijkstra's Algorithm"],
  ["bellman-ford",      "Bellman-Ford Algorithm"],
  ["bellman ford",      "Bellman-Ford Algorithm"],
  ["bellman",           "Bellman-Ford Algorithm"],
  ["breadth first",     "BFS (Breadth-First Search)"],
  ["depth first",       "DFS (Depth-First Search)"],
  ["kruskal",           "Minimum Spanning Tree"],
  ["prim",              "Minimum Spanning Tree"],
  ["huffman",           "Huffman Codes"],
  ["asymptotic notation","Asymptotic Notation"],
  ["asymptotic",        "Asymptotic Notation"],
  ["recurrence",        "Master Theorem"],
  ["strassen",          "Strassen's Algorithm"],
  ["heapify",           "Heap Sort"],
  ["matrix chain",      "Dynamic Programming"],
  ["rod cutting",       "Dynamic Programming"],
  ["longest common",    "Dynamic Programming"],
  ["knapsack",          "Dynamic Programming"],
  ["lcs",               "Dynamic Programming"],
  ["greedy",            "Greedy Algorithms"],
  ["big-o",             "Asymptotic Notation"],
  ["big o",             "Asymptotic Notation"],
  ["big omega",         "Asymptotic Notation"],
  ["big theta",         "Asymptotic Notation"],
  ["little-o",          "Asymptotic Notation"],
  ["little omega",      "Asymptotic Notation"],
  ["lower bound",       "Lower Bounds for Sorting"],
  ["median",            "Medians and Order Statistics"],
  ["graph representation","Graph Representations"],
  ["adjacency list",    "Graph Representations"],
  ["adjacency matrix",  "Graph Representations"],
  ["bfs",               "BFS (Breadth-First Search)"],
  ["dfs",               "DFS (Depth-First Search)"],
  ["dp",                "Dynamic Programming"],
  ["heap",              "Heap Sort"],
  ["insertion",         "Insertion Sort"],
  ["merge",             "Merge Sort"],
  ["quick",             "Quick Sort"],
];

const extractSingleTopic = (text) => {
  const q = ` ${text.toLowerCase()} `;
  for (const [kw, name] of TOPIC_MAP) {
    if (q.includes(` ${kw} `) || q.includes(`${kw} `) || q.includes(` ${kw}`)) {
      return name;
    }
  }
  return null;
};

// ─────────────────────────────────────────────────────────────────
// 5. EXTRACT BOTH TOPICS FOR COMPARATIVE QUERIES
// ─────────────────────────────────────────────────────────────────
const extractBothTopics = (q) => {
  const lower = q.toLowerCase();
  let m;

  // "X vs Y" or "X versus Y"
  m = lower.match(/^(.+?)\s+(?:vs\.?|versus)\s+(.+?)(?:\s*[?!.])?$/);
  if (m) return [extractSingleTopic(m[1]), extractSingleTopic(m[2])];

  // "compare X and Y" or "compare X with Y"
  m = lower.match(/compare\s+(.+?)\s+(?:and|with|to)\s+(.+?)(?:\s*[?!.])?$/);
  if (m) return [extractSingleTopic(m[1]), extractSingleTopic(m[2])];

  // "difference between X and Y"
  m = lower.match(/difference between\s+(.+?)\s+and\s+(.+?)(?:\s*[?!.])?$/);
  if (m) return [extractSingleTopic(m[1]), extractSingleTopic(m[2])];

  // "which is better/faster: X or Y"
  m = lower.match(/(?:which|what).+?(?:better|faster|slower|worse)[:\s]+(.+?)\s+or\s+(.+?)(?:\s*[?!.])?$/);
  if (m) return [extractSingleTopic(m[1]), extractSingleTopic(m[2])];

  return [null, null];
};

// ─────────────────────────────────────────────────────────────────
// 6. INTENT-AWARE RESPONSE BUILDER
// ─────────────────────────────────────────────────────────────────
const buildIntentResponse = (kbTopic, intent) => {
  switch (intent) {

    case "example":
      return buildExampleResponse(kbTopic);

    case "procedural":
      return buildProceduralResponse(kbTopic);

    case "complexity": {
      // Extract complexity from KB topic structure
      const tc = kbTopic.complexity?.time;
      const complexity = {
        algorithm: kbTopic.name,
        best:    tc?.best    || (typeof tc === "string" ? tc : "N/A"),
        average: tc?.average || (typeof tc === "string" ? tc : "N/A"),
        worst:   tc?.worst   || (typeof tc === "string" ? tc : "N/A"),
        space:   kbTopic.complexity?.space || "N/A",
        stable:  kbTopic.stable ?? null,
      };
      return buildComplexityResponse(complexity);
    }

    default:
      return buildConceptualResponse(kbTopic);
  }
};

// ─────────────────────────────────────────────────────────────────
// 7. PROGRESS HELPER
// ─────────────────────────────────────────────────────────────────
const updateProgress = async (userId, topicName) => {
  if (!userId) return;
  await Progress.findOneAndUpdate(
    { userId },
    { $addToSet: { topicsViewed: topicName }, $inc: { totalQueries: 1 }, lastActive: new Date() },
    { upsert: true, new: true }
  );
};

// ─────────────────────────────────────────────────────────────────
// 8. MAIN HANDLER
// ─────────────────────────────────────────────────────────────────
const handleQuery = async (req, res) => {
  try {
    const { query, inputMode = "text" } = req.body;
    if (!query?.trim())
      return res.status(400).json({ message: "Query cannot be empty" });

    const userId   = req.user?.id || null;
    const original = query.trim();

    // Normalize: fix typos, expand synonyms
    const q        = normalizeQuery(original);
    const qExpanded = expandSynonyms(q);

    console.log(`\n${"─".repeat(50)}`);
    console.log(`📨 Query: "${original}"`);
    if (q !== original.toLowerCase().trim()) console.log(`📝 Normalized: "${q}"`);

    // ── Domain check ──────────────────────────────────────────────
    if (!isAoA(qExpanded)) {
      return res.json({
        success: false,
        message: "🤖 I am specialized only in Analysis of Algorithms.\n\nYou can ask me about:\n• Sorting: Merge Sort, Quick Sort, Heap Sort, Counting Sort, Radix Sort\n• Searching: Binary Search\n• Graphs: BFS, DFS, Dijkstra, Bellman-Ford, Topological Sort\n• Trees: BST, Red-Black Trees\n• DP: Rod Cutting, LCS, Matrix Chain, Knapsack\n• Greedy: Huffman Coding, Activity Selection, Kruskal, Prim\n• Complexity: Big-O, Master Theorem, Recurrences",
      });
    }

    // ── Detect intent and topic ───────────────────────────────────
    const intent = detectIntent(q);
    const topic  = extractSingleTopic(q) || extractSingleTopic(qExpanded);
    console.log(`🎯 Intent: ${intent} | Topic: ${topic}`);

    // ── Load all KB topics once ───────────────────────────────────
    const allTopics = await Topic.find();

    // ── Step 1: Recurrence / Master Theorem ──────────────────────
    const parsed = parseRecurrence(q);
    if (parsed.found) {
      const result = solveMasterTheorem(parsed.a, parsed.b, parsed.k);
      await Query.create({ userId, queryText: original, matchedTopic: "Master Theorem", responseGiven: true, inputMode });
      await updateProgress(userId, "Master Theorem");
      return res.json({ success: true, source: "math-solver", structured: buildMathResponse(result) });
    }

    // ── Step 2: Complexity database ───────────────────────────────
    if (intent === "complexity") {
      const complexity = getComplexity(q) || (topic ? getComplexity(topic.toLowerCase()) : null);
      if (complexity) {
        await Query.create({ userId, queryText: original, matchedTopic: complexity.algorithm, responseGiven: true, inputMode });
        await updateProgress(userId, complexity.algorithm);
        return res.json({ success: true, source: "complexity-db", structured: buildComplexityResponse(complexity) });
      }
    }

    // ── Step 3: Comparative — extract and compare two topics ──────
    if (intent === "comparative") {
      const [name1, name2] = extractBothTopics(q);
      console.log(`🔀 Comparing: "${name1}" vs "${name2}"`);

      if (name1 && name2) {
        const t1 = matchTopic(name1, allTopics);
        const t2 = matchTopic(name2, allTopics);

        if (t1 && t2) {
          await Query.create({ userId, queryText: original, matchedTopic: `${t1.name} vs ${t2.name}`, responseGiven: true, inputMode });
          await updateProgress(userId, t1.name);
          return res.json({
            success: true,
            source:  "knowledge-base-compare",
            structured: buildComparativeResponse(t1, t2),
          });
        }

        // Only one topic found — show it with comparison note
        const found = t1 || t2;
        const missing = !t1 ? name1 : name2;
        if (found) {
          await Query.create({ userId, queryText: original, matchedTopic: found.name, responseGiven: true, inputMode });
          const baseResp = buildConceptualResponse(found);
          baseResp.answer = (baseResp.definition || "") +
            `\n\n(Note: Could not find detailed information for "${missing}" to complete the comparison.)`;
          return res.json({ success: true, source: "knowledge-base", structured: baseResp });
        }
      }
      // Fall through to TF-IDF for unrecognized comparative queries
    }

    // ── Step 4: TF-IDF Search (primary AI engine) ─────────────────
    const aiResult = await findAnswer(q);

    if (aiResult.found) {
      const data = aiResult.data;

      // Try to enrich with KB data for intent-appropriate formatting
      const searchKey = topic || data.topic || q;
      const kbMatch   = matchTopic(searchKey, allTopics);

      await Query.create({ userId, queryText: original, matchedTopic: kbMatch?.name || data.topic, responseGiven: true, inputMode });
      await updateProgress(userId, kbMatch?.name || data.topic);

      if (kbMatch) {
        // KB enrichment: use intent-appropriate builder with rich KB data
        console.log(`📗 KB enrichment: ${kbMatch.name}`);
        return res.json({
          success: true,
          source:  "tfidf+kb",
          structured: buildIntentResponse(kbMatch, intent),
        });
      }

      // No KB match — return TF-IDF answer directly
      let fullAnswer = data.answer;
      if (aiResult.alternatives?.length > 0) {
        const sameTopic = aiResult.alternatives.filter(
          a => a.topic === data.topic && a.answer !== data.answer
        );
        if (sameTopic.length > 0 && fullAnswer.length < 300) {
          fullAnswer += "\n\n" + sameTopic.slice(0, 2).map(a => a.answer).join("\n\n");
        }
      }

      return res.json({
        success: true,
        source:  "tfidf-model",
        structured: {
          type:            intent,
          topic:           data.topic,
          definition:      fullAnswer,
          matchedQuestion: data.question,
          score:           data.score,
          keyPoints:       [],
          timeComplexity:  null,
          spaceComplexity: null,
          followUp:        aiResult.alternatives?.map(a => a.question).filter(Boolean) || [],
          steps:           [],
        },
      });
    }

    // ── Step 5: Knowledge Base fallback ───────────────────────────
    const matched = matchTopic(topic || q, allTopics) || matchTopic(q, allTopics);

    await Query.create({ userId, queryText: original, matchedTopic: matched?.name || null, responseGiven: !!matched, inputMode });

    if (matched) {
      await updateProgress(userId, matched.name);
      return res.json({
        success: true,
        source:  "knowledge-base",
        structured: buildIntentResponse(matched, intent),
      });
    }

    // ── Step 6: Unknown query ─────────────────────────────────────
    await logUnknownQuery(original, userId);
    return res.json({
      success: false,
      message: `❓ I couldn't find information about "${original}".\n\nTry asking about:\nMerge Sort, Quick Sort, Binary Search, Dijkstra, BFS, DFS, Dynamic Programming, Master Theorem, Big-O Notation`,
    });

  } catch (err) {
    console.error("💥 Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { handleQuery };
