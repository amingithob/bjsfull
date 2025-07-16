// BlackjackApp.tsx (Card Counting + Seen Cards + Export + History)
import React, { useState } from 'react';

let handId = 1;
const DEFAULT_BET = "1";
const cardValues = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const decisions = ["Stand", "Cashout", "Double", "Split", "Blackjack"];
const results = ["Win", "Lose", "Push"];

export default function BlackjackApp() {
  const [hands, setHands] = useState(() => {
    const stored = localStorage.getItem("blackjack_hands");
    return stored ? JSON.parse(stored) : [];
  });
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [seenCards, setSeenCards] = useState([]);
  const [betAmount, setBetAmount] = useState(DEFAULT_BET);
  const [cashoutValue, setCashoutValue] = useState("");
  const [decision, setDecision] = useState("");
  const [result, setResult] = useState("");
  const [deckCount, setDeckCount] = useState(6);

  const allCards = [
    ...hands.flatMap(h => h.player.split(" ")),
    ...hands.flatMap(h => h.dealer.split(" ")),
    ...seenCards
  ];

  const runningCount = allCards.reduce((sum, card) => {
    if (["2", "3", "4", "5", "6"].includes(card)) return sum + 1;
    if (["10", "J", "Q", "K", "A"].includes(card)) return sum - 1;
    return sum;
  }, 0);

  const totalDecksUsed = Math.max(1, allCards.length / 52);
  const trueCount = (runningCount / (deckCount - totalDecksUsed)).toFixed(2);

  const totalBet = hands.reduce((sum, h) => {
    const baseBet = Number(h.bet);
    const multiplier = h.decision === "Double" ? 2 : 1;
    return sum + baseBet * multiplier;
  }, 0);
  

 const totalProfit = hands.reduce((sum, h) => {
  const bet = Number(h.bet);
  const multiplier = h.decision === "Double" ? 2 : 1;
  const effectiveBet = bet * multiplier;
  const cash = Number(h.cashout);

  if (h.decision === "Cashout") return sum + cash;

  if (h.result === "Win") {
    if (h.decision === "Blackjack") return sum + bet * 2.5;
    return sum + effectiveBet * 2;
  }

  if (h.result === "Push") {
    return sum + effectiveBet; // ✅ اصلاح‌شده برای push
  }

  // result === "Lose"
  return sum;
}, 0);


  const netProfit = totalProfit - totalBet;

  const rtp = totalBet > 0 ? (totalProfit / totalBet * 100).toFixed(1) : "0";
  const avgWin = hands.length > 0 ? (totalProfit / hands.length).toFixed(2) : "0";

  const addCard = (card, isDealer) => {
    if (isDealer) setDealerCards(prev => [...prev, card]);
    else setPlayerCards(prev => [...prev, card]);
  };

  const removeCard = (index, isDealer) => {
    if (isDealer) setDealerCards(prev => prev.filter((_, i) => i !== index));
    else setPlayerCards(prev => prev.filter((_, i) => i !== index));
  };

  const addSeenCard = (card) => setSeenCards(prev => [...prev, card]);
  const removeSeenCard = (index) => setSeenCards(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = () => {
    if (!playerCards.length || !dealerCards.length || !betAmount || !decision || !result) return;
    const newHands = [...hands, {
      id: handId++,
      player: playerCards.join(" "),
      dealer: dealerCards.join(" "),
      bet: betAmount,
      cashout: cashoutValue || "0",
      decision,
      result
    }];
    setHands(newHands);
    localStorage.setItem("blackjack_hands", JSON.stringify(newHands));
    setPlayerCards([]);
    setDealerCards([]);
    setCashoutValue("");
    setDecision("");
    setResult("");
  };

  const cardSum = (cards) => {
    const values = cards.map(c => c === "A" ? 11 : ["K", "Q", "J"].includes(c) ? 10 : parseInt(c));
    let total = values.reduce((a, b) => a + b, 0);
    let aces = cards.filter(c => c === "A").length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  };

const generateExportText = () => {
  const lines = hands.map((h) => {
    const dealerCards = h.dealer.split(" ");
    const playerCards = h.player.split(" ");
    const bet = Number(h.bet);
    const multiplier = h.decision === "Double" ? 2 : 1;
    const effectiveBet = bet * multiplier;
    let profit = 0;
    let decisionUsed = h.decision;

    if (h.result === "Push") {
      profit = effectiveBet;
    } else if (decisionUsed === "Cashout") {
      profit = Number(h.cashout);
    } else if (h.result === "Win") {
      if (decisionUsed === "Double") profit = bet * 4;
      else if (decisionUsed === "Blackjack") profit = bet * 2.5;
      else profit = bet * 2;
    } else if (h.result === "Lose") {
      profit = 0;
    }

    const sum = (cards) => {
      const values = cards.map(c => c === "A" ? 11 : ["K", "Q", "J"].includes(c) ? 10 : parseInt(c));
      let total = values.reduce((a, b) => a + b, 0);
      let aces = cards.filter(c => c === "A").length;
      while (total > 21 && aces > 0) { total -= 10; aces--; }
      return total;
    };

    const dealerTotal = sum(dealerCards);
    const playerTotal = sum(playerCards);
    const decisionLabel = h.result === "Push" ? "Push" : h.decision;

    let tag = "";
    if (h.result === "Push") tag = "push";
    else if (h.decision === "Double") tag = h.result === "Win" ? "ddw" : h.result === "Lose" ? "ddl" : "ddp";
    else if (h.decision === "Cashout") tag = h.result === "Win" ? "cow" : "col";
    else if (h.decision === "Blackjack") tag = "bj";
    else if (h.result === "Win") tag = "win";
    else if (h.result === "Lose") tag = "los";
    else tag = decisionLabel.toLowerCase();

    return `${effectiveBet}\t${profit}\t${decisionLabel}\t${playerTotal}\t${dealerTotal}\t${tag}`;
  });

  const output = lines.join("\n");

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(output)
      .then(() => alert("📋 Copied!"))
      .catch(() => fallbackCopyTextToClipboard(output));
  } else {
    fallbackCopyTextToClipboard(output);
  }
};

  return (
    <div style={{
      margin: 0,
      minHeight: "100vh",
      background: "linear-gradient(135deg, #232526 0%, #414345 100%)",
      color: "#222",
      fontFamily: 'Inter, sans-serif',
      paddingBottom: 40
    }}>
      <div style={{
        maxWidth: 600,
        margin: "0 auto",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
        padding: 32,
        marginTop: 32
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ margin: 0, color: "#3f51b5" }}>♠️ Blackjack Tracker</h1>
          <button
            onClick={() => {
              if (confirm("Clear all data?")) {
                setHands([]);
                localStorage.removeItem("blackjack_hands");
                handId = 1;
                setSeenCards([]);
              }
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginLeft: 10,
              transition: "background 0.2s"
            }}
          >
            🗑️ New Session
          </button>
        </div>

        <hr style={{ margin: "24px 0" }} />

      <section style={{ marginBottom: 24 }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 24
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>💰 Bet Amount</label>
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #bbb",
                  width: 100
                }}
              />
            </div>
            <div style={{
              width: 1,
              height: 32,
              background: "#ddd",
              margin: "0 12px"
            }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ fontWeight: 600 }}>🧮 Deck Count</label>
              <input
                type="number"
                value={deckCount}
                onChange={e => setDeckCount(Number(e.target.value))}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  border: "1px solid #bbb",
                  width: 80
                }}
              />
            </div>
          </div>
        </section>

        <hr style={{ margin: "24px 0" }} />

        <section style={{ marginBottom: 24 }}>
          <h3>🎴 Player Cards <span style={{ color: "#3f51b5" }}>({cardSum(playerCards)})</span></h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {playerCards.map((c, i) =>
              <button
                key={i}
                onClick={() => removeCard(i, false)}
                style={{
                  background: "#e3f2fd",
                  border: "1px solid #90caf9",
                  borderRadius: 6,
                  padding: "6px 10px",
                  marginRight: 4,
                  cursor: "pointer"
                }}
              >{c} ❌</button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cardValues.map(c =>
              <button
                key={c}
                onClick={() => addCard(c, false)}
                style={{
                  background: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: "6px 10px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  marginBottom: 4
                }}
                onMouseOver={e => e.currentTarget.style.background = "#bbdefb"}
                onMouseOut={e => e.currentTarget.style.background = "#f0f0f0"}
              >{c}</button>
            )}
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h3>🃏 Dealer Cards <span style={{ color: "#3f51b5" }}>({cardSum(dealerCards)})</span></h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {dealerCards.map((c, i) =>
              <button
                key={i}
                onClick={() => removeCard(i, true)}
                style={{
                  background: "#ffe0b2",
                  border: "1px solid #ffb74d",
                  borderRadius: 6,
                  padding: "6px 10px",
                  marginRight: 4,
                  cursor: "pointer"
                }}
              >{c} ❌</button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cardValues.map(c =>
              <button
                key={c}
                onClick={() => addCard(c, true)}
                style={{
                  background: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: "6px 10px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  marginBottom: 4
                }}
                onMouseOver={e => e.currentTarget.style.background = "#ffe082"}
                onMouseOut={e => e.currentTarget.style.background = "#f0f0f0"}
              >{c}</button>
            )}
          </div>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h3>👁️ Seen Cards</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {seenCards.map((c, i) =>
              <button
                key={i}
                onClick={() => removeSeenCard(i)}
                style={{
                  background: "#c8e6c9",
                  border: "1px solid #81c784",
                  borderRadius: 6,
                  padding: "6px 10px",
                  marginRight: 4,
                  cursor: "pointer"
                }}
              >{c} ❌</button>
            )}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {cardValues.map(c =>
              <button
                key={c}
                onClick={() => addSeenCard(c)}
                style={{
                  background: "#f0f0f0",
                  border: "1px solid #ccc",
                  borderRadius: 6,
                  padding: "6px 10px",
                  cursor: "pointer",
                  transition: "background 0.2s",
                  marginBottom: 4
                }}
                onMouseOver={e => e.currentTarget.style.background = "#a5d6a7"}
                onMouseOut={e => e.currentTarget.style.background = "#f0f0f0"}
              >{c}</button>
            )}
          </div>
        </section>

<hr style={{ margin: "24px 0" }} />

        <section style={{ marginBottom: 24 }}>
          <label style={{ fontWeight: 600 }}>💸 Cashout (optional)</label>
          <input
            type="number"
            value={cashoutValue}
            onChange={e => setCashoutValue(e.target.value)}
            style={{
              marginLeft: 12,
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #bbb",
              width: 120
            }}
          />
        </section>

<hr style={{ margin: "24px 0" }} />

        <section style={{
          background: "#f5f5f5",
          borderRadius: 10,
          padding: 16,
          marginBottom: 20
        }}>
          <h3>📈 Count Info</h3>
          <div style={{ display: "flex", gap: 24 }}>
            <div>
              <span style={{ fontWeight: 600 }}>Running Count:</span>
              <span style={{ color: "#388e3c", marginLeft: 8 }}>{runningCount}</span>
            </div>
            <div>
              <span style={{ fontWeight: 600 }}>True Count:</span>
              <span style={{ color: "#1976d2", marginLeft: 8 }}>{trueCount}</span>
            </div>
          </div>
        </section>

<hr style={{ margin: "24px 0" }} />

        <section style={{ marginBottom: 24 }}>
          <h3>🧠 Decision</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {decisions.map(d => (
              <button
                key={d}
                onClick={() => setDecision(d)}
                style={{
                  margin: '4px 0',
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1.5px solid #ccc',
                  cursor: 'pointer',
                  backgroundColor: decision === d ? "#795548" : "#f0f0f0",
                  color: decision === d ? "white" : "black",
                  fontWeight: 600,
                  transition: "background 0.2s"
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </section>

        <hr style={{ margin: "24px 0" }} />

        <section style={{ marginBottom: 24 }}>
          <h3>🎯 Result</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {results.map(r => (
              <button
                key={r}
                onClick={() => setResult(r)}
                style={{
                  margin: '4px 0',
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1.5px solid #ccc',
                  cursor: 'pointer',
                  backgroundColor:
                    result === r
                      ? r === "Win" ? "#4CAF50"
                        : r === "Lose" ? "#f44336"
                          : r === "Push" ? "#2196F3"
                            : "#ddd"
                      : "#f0f0f0",
                  color: result === r ? "white" : "black",
                  fontWeight: 600,
                  transition: "background 0.2s"
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={handleSubmit}
          style={{
            padding: '12px 28px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: 18,
            marginTop: 10,
            marginBottom: 24,
            transition: "background 0.2s"
          }}
        >
          ✅ Submit Hand
        </button>

        <hr style={{ margin: "32px 0" }} />

        <section style={{
          background: "#f5f5f5",
          borderRadius: 10,
          padding: 16,
          marginBottom: 24
        }}>
          <h3>📊 Stats</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
            <div><b>Total Hands:</b> {hands.length}</div>
            <div><b>Total Bet:</b> <span style={{ color: "#795548" }}>€{totalBet}</span></div>
            <div><b>Total Win:</b> <span style={{ color: "#388e3c" }}>€{totalProfit}</span></div>
            <div><b>Net Profit:</b> <span style={{ color: netProfit >= 0 ? "#388e3c" : "#f44336" }}>€{netProfit.toFixed(2)}</span></div>
            <div><b>Avg Win/Hand:</b> €{avgWin}</div>
            <div><b>RTP:</b> {rtp}%</div>
          </div>
        </section>

        <hr style={{ margin: "24px 0" }} />

        <section>
          <h3>📜 Hand History</h3>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {hands.map(h => (
              <div key={h.id} style={{
                border: '1px solid #ccc',
                borderRadius: 8,
                marginBottom: 10,
                padding: 10,
                background: "#fafafa",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
              }}>
                <div><b>ID:</b> {h.id}</div>
                <div><b>Player:</b> {h.player} <span style={{ color: "#3f51b5" }}>({cardSum(h.player.split(" "))})</span></div>
                <div><b>Dealer:</b> {h.dealer} <span style={{ color: "#3f51b5" }}>({cardSum(h.dealer.split(" "))})</span></div>
                <div><b>Bet:</b> €{h.decision === "Double" ? Number(h.bet) * 2 : h.bet}</div>
                <div><b>Cashout:</b> €{h.cashout}</div>
                <div><b>Decision:</b> {h.decision}</div>
                <div><b>Result:</b> {h.result}</div>
              </div>
            ))}
          </div>
          <button
            onClick={generateExportText}
            style={{
              padding: '12px 28px',
              backgroundColor: '#3f51b5',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: 18,
              marginTop: 30,
              marginBottom: 10,
              transition: "background 0.2s"
            }}
          >
            📋 Copy Output
          </button>
        </section>
      </div>
    </div>
  );
// ...existing code...
}
