# Finance 408 Practice Tool

Interactive web-based practice tool for UCLA Anderson's MGMT 408: Foundations of Finance.

## Project Structure

```
├── index.html              # Landing page with topic navigation
├── week1-tvm.html          # Time Value of Money (10 problems)
├── week2-capbudget.html    # Capital Budgeting (10 problems)
├── week3-stocks.html       # Stock Valuation (10 problems)
├── week4-bonds.html        # Bond Valuation (10 problems)
├── midterm.html            # Exam selection page
├── midterm1.html           # Practice Midterm 1 (20 MCQ)
├── midterm2.html           # Practice Midterm 2 (20 MCQ)
├── practice.css            # Shared styles for practice pages
├── practice.js             # Shared logic (calculator, problem engine, localStorage)
└── presentation/           # Beamer slides about Claude Code
```

## Tech Stack

- Pure HTML/CSS/JavaScript (no framework)
- KaTeX CDN for LaTeX formula rendering
- Browser localStorage for progress tracking

## Problem Data Format

Each problem in the weekly pages must have:
```javascript
{
    id: "unique_id",
    topic: "Display topic name",
    difficulty: "easy" | "medium" | "hard",
    problem_text: "The question text",
    formula: "LaTeX formula (use \\frac{}{}, \\times, etc.)",
    solution_steps: ["Step 1...", "Step 2...", ...],
    correct_answer: 123.45,
    unit: "percent" | "bps" | undefined (for dollars),
    hints: {
        level_1: "First hint",
        level_2: "More detailed hint",
        level_3: "Nearly gives away the answer"
    }
}
```

## localStorage Keys

- `finance_completed_{topic}` - Array of completed problem indices
- `finance_missed_{topic}` - Object mapping problem IDs to attempt counts

Where `{topic}` is: `tvm`, `capbudget`, `stocks`, `bonds`

## Development Notes

- Formulas use KaTeX delimiters: `\(...\)` for inline math
- Answer tolerance: 0.5% or minimum threshold based on unit type
- Calculator uses `Function()` constructor for expression evaluation
- All pages are self-contained (no build step required)
