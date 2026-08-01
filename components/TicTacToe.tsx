'use client';
import { useState, useEffect } from 'react';

export default function TicTacToe({ onWin }: { onWin: () => void }) {
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isPlayerTurn, setIsPlayerTurn] = useState(true); 
  const [winner, setWinner] = useState<string | null>(null);

  const checkWinner = (squares: any[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return null;
  };

  const findWinningMove = (squares: any[], player: string) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] === player && squares[b] === player && squares[c] === null) return c;
      if (squares[a] === player && squares[c] === player && squares[b] === null) return b;
      if (squares[b] === player && squares[c] === player && squares[a] === null) return a;
    }
    return null;
  };

  useEffect(() => {
    if (!isPlayerTurn && !winner) {
      const timer = setTimeout(() => {
        let newBoard = [...board];
        let moveToMake: number | null = null;

        const botWinMove = findWinningMove(newBoard, 'O');
        const playerWinMove = findWinningMove(newBoard, 'X');

        if (botWinMove !== null) {
          moveToMake = botWinMove;
        } else if (playerWinMove !== null) {
          moveToMake = playerWinMove;
        } else {
          const emptyIndices = newBoard.map((val, idx) => (val === null ? idx : null)).filter(val => val !== null);
          if (emptyIndices.length > 0) {
            moveToMake = emptyIndices[Math.floor(Math.random() * emptyIndices.length)] as number;
          }
        }

        if (moveToMake !== null) {
          newBoard[moveToMake] = 'O';
          setBoard(newBoard);
          
          const newWinner = checkWinner(newBoard);
          if (newWinner) {
            setWinner(newWinner);
          } else if (!newBoard.includes(null)) {
            setWinner('Draw');
          }
          setIsPlayerTurn(true);
        }
      }, 700); 
      
      return () => clearTimeout(timer);
    }
  }, [isPlayerTurn, board, winner]);

  useEffect(() => {
    if (winner === 'X') {
      const timer = setTimeout(() => onWin(), 1000);
      return () => clearTimeout(timer);
    }
  }, [winner]); 

  const handleClick = (index: number) => {
    if (board[index] || winner || !isPlayerTurn) return;

    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    
    const newWinner = checkWinner(newBoard);
    if (newWinner) {
      setWinner(newWinner);
    } else if (!newBoard.includes(null)) {
      setWinner('Draw');
    } else {
      setIsPlayerTurn(false);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setWinner(null);
    setIsPlayerTurn(true);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="grid grid-cols-3 gap-2 bg-[#A6B1E1]/20 p-2 rounded-lg shadow-inner border border-[#A6B1E1]/30">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            className="w-24 h-24 bg-[#424874] flex items-center justify-center text-5xl font-bold hover:bg-[#A6B1E1]/40 transition-colors rounded shadow"
          >
            <span className={cell === 'X' ? 'text-[#F4EEFF]' : 'text-[#DCD6F7] drop-shadow-md'}>
              {cell}
            </span>
          </button>
        ))}
      </div>
      
      {winner && (
        <div className="mt-6 text-center animate-fade-in">
          <p className="text-xl font-semibold mb-3 text-[#F4EEFF]">
            {winner === 'Draw' ? "A tie? Come on, you can do better." : winner === 'X' ? "Okay, you got me. Generating prize..." : "Ha! I win. Better luck next time."}
          </p>
          <button 
            onClick={resetGame}
            className="px-6 py-2 bg-[#A6B1E1] text-[#424874] hover:bg-[#DCD6F7] rounded-md font-bold transition-colors shadow"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}