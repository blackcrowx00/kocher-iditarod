// ═══════════════════════════════════════════════════════════
// picks.js — Kocher Iditarod Family Picks
// ═══════════════════════════════════════════════════════════
// This is the ONLY file you need to edit each year.
// After updating, upload this file to GitHub and you're done.
//
// MUSHER NAMES must match exactly as shown on the
// Race Standings tab (copy/paste from there to be safe).
//
// ROOKIE NAMES include "(r)" at the end — e.g. "Sam Martin (r)"
// Check the Race Standings tab — rookies are highlighted.
//
// FINISH TIME GUESS: your guess for how long the winner
// will take to complete the race (days + hours).
//
// ACTUAL FINISH TIME: leave null until the winner finishes,
// then enter the real time and push to GitHub.
// ═══════════════════════════════════════════════════════════

const PICKS = {

  // ── Set this once the race winner crosses the finish line ──
  actualFinishDays:  null,   // e.g. 9
  actualFinishHours: null,   // e.g. 14

  // ── Family members ─────────────────────────────────────────
  members: [
    {
      name:  "Makayla",
      color: "#38bdf8",   // blue

      // 3 musher picks for Total Score + Best Musher brackets
      picks: [
        "Michelle Phillips",
        "Ryan Redington",
        "Riley Dyche"
      ],

      // Rookie bracket — primary used first, backup if primary scratches
      rookiePrimary: "Sadie Lindquist",   // e.g. "Sam Martin (r)"
      rookieBackup:  "Jessie Terry",   // e.g. "Brenda Mackey (r)"

      // Finish Time bracket — guess for winner's total race time
      timeGuessDays:  10,
      timeGuessHours: 2
    },

    {
      name:  "Ryan",
      color: "#3ecf8e",   // green

      picks: [
        "Jessie Holmes",
        "Jeff Deeter",
        "Wade Marrs"
      ],

      rookiePrimary: "Sam Peperman",
      rookieBackup:  "Sam Martin",

      timeGuessDays:  9,
      timeGuessHours: 2
    },

    {
      name:  "Kit",
      color: "#a78bfa",   // purple

      picks: [
        "Matt Hall",
        "Travis Beals",
        "Peter Kaiser"
      ],

      rookiePrimary: "Richie Beattie",
      rookieBackup:  "Brenda Mackey",

      timeGuessDays:  9,
      timeGuessHours: 8
    },

    {
      name:  "Chuck",
      color: "#f59e0b",   // gold

      picks: [
        "Paige Drobny",
        "Mille Porsild",
        "Bailey Vitello"
      ],

      rookiePrimary: "Joseph Sabin",
      rookieBackup:  "Kjell Rukke",

      timeGuessDays:  9,
      timeGuessHours: 6
    }
  ]
};
