
// BlackjackApp.tsx (SIMPLE VERSION with native HTML elements)
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
  const [betAmount, setBetAmount] = useState(DEFAULT_BET);
  const [cashoutValue, setCashoutValue] = useState("");
  const [decision, setDecision] = useState("");
  const [result, setResult] = useState("");

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

  if (h.decision === "Cashout") return sum + (cash - bet);
  if (h.result === "Win") {
    if (h.decision === "Blackjack") return sum + bet * 1.5;
    return sum + effectiveBet;
  }
  if (h.result === "Lose") return sum - effectiveBet;
  return sum;
}, 0);


  const rtp = totalBet > 0 ? ((totalProfit + totalBet) / totalBet * 100).toFixed(1) : "0";
  const avgProfit = hands.length > 0 ? (totalProfit / hands.length).toFixed(2) : "0";

  const addCard = (card, isDealer) => {
    if (isDealer) setDealerCards(prev => [...prev, card]);
    else setPlayerCards(prev => [...prev, card]);
  };

  const removeCard = (index, isDealer) => {
    if (isDealer) setDealerCards(prev => prev.filter((_, i) => i !== index));
    else setPlayerCards(prev => prev.filter((_, i) => i !== index));
  };

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

const generateExportText = () => {
  const hands = JSON.parse(localStorage.getItem("blackjack_hands") || "[]");
  const lines = hands.map((h) => {
    const dealerCards = h.dealer.split(" ");
    const playerCards = h.player.split(" ");

    const sum = (cards: string[]) => {
      const values = cards.map(c => {
        if (c === "A") return 11;
        if (["K", "Q", "J"].includes(c)) return 10;
        return parseInt(c);
      });
      let total = values.reduce((a, b) => a + b, 0);
      let aces = cards.filter(c => c === "A").length;
      while (total > 21 && aces > 0) {
        total -= 10;
        aces--;
      }
      return total;
    };

    const dealerTotal = sum(dealerCards);
    const playerTotal = sum(playerCards);
    const bet = Number(h.bet);
    const multiplier = h.decision === "Double" ? 2 : 1;
    const effectiveBet = bet * multiplier;

    let profit = 0;
let decisionUsed = h.decision;

if (decisionUsed === "Cashout") {
  profit = Number(h.cashout) - bet;
} else if (h.result === "Win") {
  if (decisionUsed === "Double") profit = bet * 2;
  else if (decisionUsed === "Blackjack") profit = bet * 1.5;
  else profit = bet;
} else if (h.result === "Lose") {
  if (decisionUsed === "Double") profit = -bet * 2;
  else profit = -bet;
} else if (h.result === "Push") {
  profit = 0;
}
    
const decisionLabel = h.result === "Push" ? "Push" : h.decision;
let tag = "";

if (h.result === "Push") {
  tag = "push";
} else if (h.decision === "Double") {
  tag = h.result === "Win" ? "ddw" : h.result === "Lose" ? "ddl" : "ddp";
} else if (h.decision === "Cashout") {
  tag = h.result === "Win" ? "cow" : "col";
} else if (h.decision === "Blackjack") {
  tag = "bj";
} else if (h.result === "Win") {
  tag = "win";
} else if (h.result === "Lose") {
  tag = "los";
} else {
  tag = decisionLabel.toLowerCase();
}

return `${effectiveBet}\t${profit}\t${decisionLabel}\t${playerTotal}\t${dealerTotal}\t${tag}`;


    
  });

  const output = lines.join("\n");
  navigator.clipboard.writeText(output).then(() => {
    alert("📋 خروجی کپی شد!");
  });
};


  const cardSum = (cards) => {
    const values = cards.map(c => c === "A" ? 11 : ["K", "Q", "J"].includes(c) ? 10 : parseInt(c));
    let total = values.reduce((a, b) => a + b, 0);
    let aces = cards.filter(c => c === "A").length;
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>💰 Bet Amount</h2>
      <input
        type="number"
        value={betAmount}
        onChange={(e) => setBetAmount(e.target.value)}
        style={{ padding: '4px 8px', marginBottom: 12 }}
      />
      <button onClick={() => {
        if (confirm("Clear all data?")) {
          setHands([]);
          localStorage.removeItem("blackjack_hands");
          handId = 1;
        }
      }}>🗑️ New Session</button>

      <hr style={{ margin: '20px 0' }} />

      <div>
        <h3>🎴 Player Cards ({cardSum(playerCards)}):</h3>
        <div>{playerCards.map((c, i) => <button key={i} onClick={() => removeCard(i, false)}>{c} ❌</button>)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
  {cardValues.map(c => (
    <button key={c} onClick={() => addCard(c, false)}>
      {c}
    </button>
  ))}
</div>

      </div>

      <div style={{ marginTop: 10 }}>
        <h3>🃏 Dealer Cards ({cardSum(dealerCards)}):</h3>
        <div>{dealerCards.map((c, i) => <button key={i} onClick={() => removeCard(i, true)}>{c} ❌</button>)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
  {cardValues.map(c => (
    <button key={c} onClick={() => addCard(c, true)}>
      {c}
    </button>
  ))}
</div>

      </div>

      <div style={{ marginTop: 20 }}>
        <h3>💸 Cashout (optional):</h3>
        <input
          type="number"
          value={cashoutValue}
          onChange={(e) => setCashoutValue(e.target.value)}
          placeholder="Cashout (€)"
        />
      </div>

      {/* 🧠 Decision */}
<div style={{ marginTop: 20 }}>
  <h3>🧠 Decision:</h3>
  {decisions.map(d => (
    <button
      key={d}
      onClick={() => setDecision(d)}
      style={{
        margin: 4,
        padding: '6px 12px',
        backgroundColor: decision === d ? '#4CAF50' : '#f0f0f0',
        color: decision === d ? 'white' : 'black',
        border: '1px solid #ccc',
        borderRadius: 4,
        cursor: 'pointer'
      }}
    >
      {d}
    </button>
  ))}
</div>

{/* 🎯 Result */}
<div style={{ marginTop: 10 }}>
  <h3>🎯 Result:</h3>
  {results.map(r => (
    <button
      key={r}
      onClick={() => setResult(r)}
      style={{
        margin: 4,
        padding: '6px 12px',
        backgroundColor: result === r ? '#2196F3' : '#f0f0f0',
        color: result === r ? 'white' : 'black',
        border: '1px solid #ccc',
        borderRadius: 4,
        cursor: 'pointer'
      }}
    >
      {r}
    </button>
  ))}
</div>


      <div style={{ marginTop: 20 }}>
        <button onClick={handleSubmit}>✅ Submit Hand</button>
      </div>

      <hr style={{ margin: '20px 0' }} />

      <div>
        <h3>📊 Stats</h3>
        <p>Total Hands: {hands.length}</p>
        <p>Total Bet: €{totalBet}</p>
        <p>Total Profit: €{totalProfit}</p>
        <p>Avg Profit per Hand: €{avgProfit}</p>
        <p>RTP: {rtp}%</p>
      </div>

      <hr style={{ margin: '20px 0' }} />

      <div>
     <h3>📜 Hand History</h3>
{hands.map(h => {
  const bet = Number(h.bet);
  const isDouble = h.decision === "Double";
  const isBlackjack = h.decision === "Blackjack";
  const finalBet = isDouble ? bet * 2 : bet;
  const blackjackProfit = isBlackjack ? bet * 1.5 : null;

  return (
    <div key={h.id} style={{ border: '1px solid #ccc', marginBottom: 8, padding: 6 }}>
      <div>ID: {h.id}</div>
      <div>Player: {h.player} ({cardSum(h.player.split(" "))})</div>
      <div>Dealer: {h.dealer} ({cardSum(h.dealer.split(" "))})</div>
      <div>Bet: €{finalBet}</div>
      <div>
        Result: {h.result}
        {isBlackjack && ` (+€${blackjackProfit})`}
      </div>
      <div>Cashout: €{h.cashout}</div>
      <div>Decision: {h.decision}</div>
    </div>
  );
})}

              <button onClick={generateExportText} style={{ marginTop: 20 }}>
  📋 Copy Excel Output
</button>
      </div>
    </div>
  );
}
