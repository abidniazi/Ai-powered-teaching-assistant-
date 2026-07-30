const { spawn } = require("child_process");
const path      = require("path");

const SEARCH_SCRIPT = path.join(__dirname, "../model/search.py");

const findAnswer = (query) => {
  return new Promise((resolve) => {
    console.log(`🔍 TF-IDF searching: "${query}"`);

    const py  = spawn("py", [SEARCH_SCRIPT, query]);
    let   out = "";

    py.stdout.on("data", d => { out += d.toString(); });
    py.stderr.on("data", d => {
      // Ignore stderr (sklearn warnings)
    });

    py.on("close", () => {
      try {
        const start = out.indexOf("[");
        const end   = out.lastIndexOf("]");
        if (start === -1 || end === -1) {
          resolve({ found: false });
          return;
        }

        const results = JSON.parse(out.substring(start, end + 1));

        if (results.length === 0) {
          resolve({ found: false });
          return;
        }

        const best = results[0];
        console.log(`✅ Found: "${best.topic}" | Intent: ${best.intent} | Score: ${best.score}`);

        resolve({
          found:        true,
          data:         best,
          alternatives: results.slice(1),
        });

      } catch (e) {
        console.log("⚠️ Parse error:", e.message);
        resolve({ found: false });
      }
    });

    setTimeout(() => {
      py.kill();
      console.log("⏰ Search timeout");
      resolve({ found: false });
    }, 8000);
  });
};
module.exports = { findAnswer };