# AOA Assistant

## Project Overview
An AI-powered assistant for Analysis of Algorithms (AOA) subject.

## Stack
- Backend: Node.js/Express
- AI/ML: Python (TF-IDF model, search, train_model.py)
- Controllers: authController, progressController, queryController, topicController

## Commands
- `npm run dev` - Start backend server
- `python model/train_model.py` - Retrain the TF-IDF model

## Key Files
- `model/train_model.py` - Model training script
- `model/search.py` - Search logic
- `utils/aiEngine.js` - AI engine
- `utils/intentDetector.js` - Intent detection
- `utils/mathSolver.js` - Math solver utility