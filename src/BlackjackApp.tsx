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
    if (h.result === "Lose") return sum;
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
    const hands = JSON.parse(localStorage.getItem("blackjack_hands") || "[]");
    const lines = hands.map((h) => {
      const dealerCards = h.dealer.split(" ");
      const playerCards = h.player.split(" ");
      const bet = Number(h.bet);
      const multiplier = h.decision === "Double" ? 2 : 1;
      const effectiveBet = bet * multiplier;
      let profit = 0;
      let decisionUsed = h.decision;
      if (decisionUsed === "Cashout") {
        profit = Number(h.cashout);
      } else if (h.result === "Win") {
        if (decisionUsed === "Double") profit = bet * 4;
        else if (decisionUsed === "Blackjack") profit = bet * 2.5;
        else profit = bet * 2;

      } else if (h.result === "Lose") {
      profit = 0;
      }
      else if (h.result === "Push") {
        profit = bet;
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
    navigator.clipboard.writeText(output).then(() => alert("📋 Done!"));
  };

  return (

          <div style={{ marginTop: 10 }}>
      
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>

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
    marginLeft: 10
  }}
>
  🗑️ New Session
</button>
        
       <button
  onClick={generateExportText}
  style={{
    padding: '8px 16px',
    backgroundColor: '#3f51b5',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: 16
  }}
>
  📋 Copy Output
</button>

      </div>

      <hr />
            
      <h2>💰 Bet Amount</h2>
      <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} />

             <hr />
            
      <h3>🧮 Deck Count</h3>
      <input type="number" value={deckCount} onChange={e => setDeckCount(Number(e.target.value))} />


 <hr />
            
      <div>
        <h3>🎴 Player Cards ({cardSum(playerCards)}):</h3>
        <div>{playerCards.map((c, i) => <button key={i} onClick={() => removeCard(i, false)}>{c} ❌</button>)}</div>
        {cardValues.map(c => <button key={c} onClick={() => addCard(c, false)}>{c}</button>)}
      </div>

      <div>
        <h3>🃏 Dealer Cards ({cardSum(dealerCards)}):</h3>
        <div>{dealerCards.map((c, i) => <button key={i} onClick={() => removeCard(i, true)}>{c} ❌</button>)}</div>
        {cardValues.map(c => <button key={c} onClick={() => addCard(c, true)}>{c}</button>)}
      </div>

      <div>
        <h3>👁️ Seen Cards:</h3>
        <div>{seenCards.map((c, i) => <button key={i} onClick={() => removeSeenCard(i)}>{c} ❌</button>)}</div>
        {cardValues.map(c => <button key={c} onClick={() => addSeenCard(c)}>{c}</button>)}
      </div>
 <hr />
      <div>
        <h3>💸 Cashout (optional)</h3>
        <input type="number" value={cashoutValue} onChange={e => setCashoutValue(e.target.value)} />
      </div>
 <hr />
      <div>
        <h3>📈 Count Info:</h3>
        <p>Running Count: {runningCount}</p>
        <p>True Count: {trueCount}</p>
      </div>
 <hr />
      <div>
        <h3>🧠 Decision:</h3>
        {decisions.map(d => (
  <button
    key={d}
    onClick={() => setDecision(d)}
    style={{
      margin: '4px',
      padding: '6px 12px',
      borderRadius: 4,
      border: '1px solid #ccc',
      cursor: 'pointer',
      backgroundColor: decision === d ? "#795548" : "#f0f0f0",  // رنگ قهوه‌ای ملایم برای انتخاب‌شده
      color: decision === d ? "white" : "black"
    }}
  >
    {d}
  </button>
))}

      </div>
 <hr />
      <div>
        <h3>🎯 Result:</h3>
        {results.map(r => (
  <button
    key={r}
    onClick={() => setResult(r)}
    style={{
      margin: '4px',
      padding: '6px 12px',
      borderRadius: 4,
      border: '1px solid #ccc',
      cursor: 'pointer',
      backgroundColor:
        result === r
          ? r === "Win" ? "#4CAF50"
          : r === "Lose" ? "#f44336"
          : r === "Push" ? "#2196F3"
          : "#ddd"
        : "#f0f0f0",
      color: result === r ? "white" : "black"
    }}
  >
    {r}
  </button>
))}

      </div>

      <button
  onClick={handleSubmit}
  style={{
    padding: '10px 20px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: 10
  }}
>
  ✅ Submit Hand
</button>


      <hr />
      <h3>📊 Stats</h3>
      <p>Total Hands: {hands.length}</p>
      <p>Total Bet: €{totalBet}</p>
      <p>Total Win: €{totalProfit}</p>
      <p>Net Profit: €{netProfit.toFixed(2)}</p>
      <p>Avg Win per Hand: €{avgWin}</p>
      <p>RTP: {rtp}%</p>

      <hr />
      <h3>📜 Hand History</h3>
      {hands.map(h => (
        <div key={h.id} style={{ border: '1px solid #ccc', marginBottom: 8, padding: 6 }}>
          <div>ID: {h.id}</div>
          <div>Player: {h.player} ({cardSum(h.player.split(" "))})</div>
          <div>Dealer: {h.dealer} ({cardSum(h.dealer.split(" "))})</div>
          <div>Bet: €{h.decision === "Double" ? Number(h.bet) * 2 : h.bet}</div>
          <div>Cashout: €{h.cashout}</div>
          <div>Decision: {h.decision}</div>
          <div>Result: {h.result}</div>
        </div>
      ))}
    </div>
  );
}
