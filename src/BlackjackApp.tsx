// BlackjackApp.tsx (FULL VERSION with Card Counting, Seen Cards, History and Export)
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
      if (h.decision === "Blackjack") return sum + bet * 1.5;
      return sum + effectiveBet;
    }
    if (h.result === "Lose") return sum - effectiveBet;
    return sum;
  }, 0);

  const rtp = totalBet > 0 ? ((totalProfit + totalBet) / totalBet * 100).toFixed(1) : "0";
  const avgProfit = hands.length > 0 ? (totalProfit / hands.length).toFixed(2) : "0";

  const addCard = (card, isDealer, isSeen) => {
    if (isSeen) setSeenCards(prev => [...prev, card]);
    else if (isDealer) setDealerCards(prev => [...prev, card]);
    else setPlayerCards(prev => [...prev, card]);
  };

  const removeCard = (index, isDealer, isSeen) => {
    if (isSeen) setSeenCards(prev => prev.filter((_, i) => i !== index));
    else if (isDealer) setDealerCards(prev => prev.filter((_, i) => i !== index));
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
    const stored = JSON.parse(localStorage.getItem("blackjack_hands") || "[]");
    const lines = stored.map(h => {
      const playerTotal = cardSum(h.player.split(" "));
      const dealerTotal = cardSum(h.dealer.split(" "));
      const bet = Number(h.bet);
      const multiplier = h.decision === "Double" ? 2 : 1;
      const effectiveBet = bet * multiplier;
      let profit = 0;
      if (h.decision === "Cashout") profit = Number(h.cashout);
      else if (h.result === "Win") profit = h.decision === "Blackjack" ? bet * 1.5 : effectiveBet;
      else if (h.result === "Lose") profit = -effectiveBet;
      else if (h.result === "Push") profit = 0;

      const tag = h.result === "Push" ? "push" :
        h.decision === "Double" ? (h.result === "Win" ? "ddw" : h.result === "Lose" ? "ddl" : "ddp") :
        h.decision === "Cashout" ? (h.result === "Win" ? "cow" : "col") :
        h.decision === "Blackjack" ? "bj" :
        h.result === "Win" ? "win" : "los";

      return `${effectiveBet}\t${profit}\t${h.decision}\t${playerTotal}\t${dealerTotal}\t${tag}`;
    });
    navigator.clipboard.writeText(lines.join("\n"));
    alert("📋 خروجی کپی شد!");
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
      <input type="number" value={betAmount} onChange={(e) => setBetAmount(e.target.value)} />

      <h3>🧮 Deck Count</h3>
      <input type="number" value={deckCount} onChange={(e) => setDeckCount(Number(e.target.value))} />

      <button onClick={() => {
        if (confirm("Clear all data?")) {
          setHands([]);
          setSeenCards([]);
          localStorage.removeItem("blackjack_hands");
          handId = 1;
        }
      }}>🗑️ New Session</button>

      <div style={{ marginTop: 20 }}>
        <h3>🧮 Seen Cards (others on table):</h3>
        <div>{seenCards.map((c, i) => <button key={i} onClick={() => removeCard(i, false, true)}>{c} ❌</button>)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {cardValues.map(c => <button key={c} onClick={() => addCard(c, false, true)}>{c}</button>)}
        </div>
      </div>

      <div>
        <h3>🎴 Player Cards ({cardSum(playerCards)}):</h3>
        <div>{playerCards.map((c, i) => <button key={i} onClick={() => removeCard(i, false, false)}>{c} ❌</button>)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {cardValues.map(c => <button key={c} onClick={() => addCard(c, false, false)}>{c}</button>)}
        </div>
      </div>

      <div>
        <h3>🃏 Dealer Cards ({cardSum(dealerCards)}):</h3>
        <div>{dealerCards.map((c, i) => <button key={i} onClick={() => removeCard(i, true, false)}>{c} ❌</button>)}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {cardValues.map(c => <button key={c} onClick={() => addCard(c, true, false)}>{c}</button>)}
        </div>
      </div>

      <h3>💸 Cashout (optional):</h3>
      <input type="number" value={cashoutValue} onChange={(e) => setCashoutValue(e.target.value)} />

      <h3>📈 Count Info:</h3>
      <p>Running Count: {runningCount}</p>
      <p>True Count: {trueCount}</p>

      <h3>🧠 Decision:</h3>
      {decisions.map(d => (
        <button key={d} onClick={() => setDecision(d)} style={{ backgroundColor: decision === d ? '#4CAF50' : '#eee' }}>{d}</button>
      ))}

      <h3>🎯 Result:</h3>
      {results.map(r => (
        <button key={r} onClick={() => setResult(r)} style={{ backgroundColor: result === r ? '#2196F3' : '#eee' }}>{r}</button>
      ))}

      <button onClick={handleSubmit}>✅ Submit Hand</button>

      <h3>📊 Stats</h3>
      <p>Total Hands: {hands.length}</p>
      <p>Total Bet: €{totalBet}</p>
      <p>Total Profit: €{totalProfit}</p>
      <p>Avg Profit per Hand: €{avgProfit}</p>
      <p>RTP: {rtp}%</p>

      <h3>📜 Hand History</h3>
      {hands.map(h => (
        <div key={h.id} style={{ border: '1px solid #ccc', marginBottom: 8, padding: 6 }}>
          <div>ID: {h.id}</div>
          <div>Player: {h.player} ({cardSum(h.player.split(" "))})</div>
          <div>Dealer: {h.dealer} ({cardSum(h.dealer.split(" "))})</div>
          <div>Bet: €{h.decision === "Double" ? Number(h.bet) * 2 : h.bet}</div>
          <div>Result: {h.result}</div>
          <div>Cashout: €{h.cashout}</div>
          <div>Decision: {h.decision}</div>
        </div>
      ))}

      <button onClick={generateExportText}>📋 Copy Excel Output</button>
    </div>
  );
}
