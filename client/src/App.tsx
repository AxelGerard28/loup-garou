import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Role } from './types';
import { Users, Moon, Sun } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket: Socket = io(SOCKET_URL);

function App() {
  const [name, setName] = useState('');
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);

  const [actionResult, setActionResult] = useState<string | null>(null);

  useEffect(() => {
    function onConnect() {
      setIsConnected(true);
    }

    function onDisconnect() {
      setIsConnected(false);
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    socket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
      setActionResult(null);
    });

    socket.on('roleAssigned', (role: Role) => {
      setMyRole(role);
    });

    socket.on('actionResult', (msg: string) => {
      setActionResult(msg);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameStateUpdate');
      socket.off('roleAssigned');
      socket.off('actionResult');
    };
  }, []);

  const joinGame = () => {
    if (name.trim()) {
      socket.emit('joinRoom', name);
      setJoined(true);
    }
  };

  const toggleReady = () => {
    socket.emit('readyUp');
  };

  const startGame = () => {
    socket.emit('startGame');
  };

  const performAction = (action: string, targetId?: string) => {
    socket.emit('roleAction', action, targetId);
  };

  const castVote = (targetId: string) => {
    socket.emit('vote', targetId);
  };

  const me = gameState?.players.find(p => p.id === socket.id);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-dark">
        <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-xl text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Erreur de Connexion</h2>
          <p className="text-gray-300 mb-6">Impossible de joindre le serveur de jeu à : <br/><code className="bg-black/40 px-2 py-1 rounded">{SOCKET_URL}</code></p>
          <div className="animate-pulse text-sm text-gray-400">Tentative de reconnexion en cours...</div>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-game-dark to-game-night">
        <h1 className="text-6xl font-bold mb-8 text-game-blood tracking-widest uppercase">Loup Garou</h1>
        <div className="bg-white/10 p-8 rounded-xl backdrop-blur-md w-full max-w-md shadow-2xl border border-white/20">
          <input
            type="text"
            placeholder="Ton nom de villageois..."
            className="w-full p-4 mb-4 bg-black/30 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-game-blood"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            onClick={joinGame}
            className="w-full p-4 bg-game-blood hover:bg-red-700 transition-colors rounded-lg font-bold text-xl uppercase"
          >
            Rejoindre le village
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) return <div className="flex items-center justify-center min-h-screen text-2xl">Chargement...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <h2 className="text-3xl font-bold text-game-blood uppercase tracking-wider">Village de Loup-Garou</h2>
        <div className="flex items-center gap-4">
          <span className="bg-white/10 px-4 py-2 rounded-full flex items-center gap-2">
            <Users size={20} /> {gameState.players.length} Joueurs
          </span>
          {gameState.phase === 'NIGHT' ? <Moon className="text-blue-400" /> : <Sun className="text-yellow-400" />}
        </div>
      </header>

      {gameState.phase === 'LOBBY' && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white/5 p-6 rounded-xl border border-white/10">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
              Lobby d'attente
            </h3>
            <ul className="space-y-3">
              {gameState.players.map((p) => (
                <li key={p.id} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                  <span className="flex items-center gap-2">
                    {p.name} {p.isHost && <span className="text-xs bg-game-blood px-2 py-0.5 rounded uppercase">Host</span>}
                  </span>
                  <span className={p.isReady ? "text-green-400 font-bold" : "text-gray-500"}>
                    {p.isReady ? "PRÊT" : "EN ATTENTE"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="flex flex-col justify-center items-center gap-6">
            <button
              onClick={toggleReady}
              className={`w-full py-4 rounded-xl font-bold text-xl transition-all ${
                me?.isReady ? 'bg-green-600 hover:bg-green-700' : 'bg-white/10 hover:bg-white/20'
              }`}
            >
              {me?.isReady ? "Je suis prêt !" : "Cliquer pour être prêt"}
            </button>
            {me?.isHost && (
              <button
                onClick={startGame}
                disabled={gameState.players.length < 4}
                className="w-full py-4 bg-game-blood hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-xl uppercase shadow-lg shadow-game-blood/20"
              >
                Lancer la partie (4+ joueurs)
              </button>
            )}
            <p className="text-gray-400 text-sm italic text-center">
              Il faut au moins 4 joueurs pour commencer l'aventure.
            </p>
          </div>
        </div>
      )}

      {gameState.phase === 'END' && (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <h2 className="text-6xl font-bold mb-4 text-game-blood">VICTOIRE !</h2>
          <p className="text-3xl mb-8">Les {gameState.winner === 'WEREWOLVES' ? 'Loups-Garous' : 'Villageois'} ont gagné.</p>
          <button onClick={() => window.location.reload()} className="px-8 py-4 bg-white/10 hover:bg-white/20 rounded-xl font-bold">REJOUER</button>
        </div>
      )}

      {gameState.phase !== 'LOBBY' && gameState.phase !== 'END' && (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className={`bg-white/5 p-6 rounded-2xl border border-white/10 relative overflow-hidden ${!me?.isAlive && 'opacity-50'}`}>
              <div className={`absolute top-0 right-0 p-4 font-bold uppercase tracking-tighter text-4xl opacity-10 rotate-12`}>
                {myRole}
              </div>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
                Ton Rôle : <span className="text-game-blood">{myRole}</span>
                {!me?.isAlive && <span className="text-red-500 text-sm">(Tu es mort)</span>}
              </h3>
              <p className="text-gray-300 italic">
                {myRole === 'WEREWOLF' && "Tu dois dévorer tous les villageois sans te faire repérer."}
                {myRole === 'VILLAGER' && "Ton seul but est de survivre et d'éliminer les loups."}
                {myRole === 'SEER' && "Chaque nuit, tu peux découvrir l'identité d'un joueur."}
                {myRole === 'WITCH' && "Tu as deux potions : une pour sauver, une pour tuer."}
              </p>
              {actionResult && (
                <div className="mt-4 p-3 bg-blue-900/40 border border-blue-500/50 rounded text-blue-200">
                  {actionResult}
                </div>
              )}
            </div>

            {gameState.phase === 'DAY' && (
              <div className="bg-yellow-900/20 p-4 rounded-xl border border-yellow-700/30 text-yellow-200">
                ☀️ Le village se réveille. {gameState.lastDeath === 'Personne' ? "La nuit a été calme." : `Malheur ! ${gameState.lastDeath} a été dévoré.`}
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gameState.players.map(p => (
                <div key={p.id} className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  p.isAlive ? 'bg-white/5 border-white/10' : 'bg-red-900/20 border-red-900/50 grayscale'
                }`}>
                  <div>
                    <div className="font-bold truncate">{p.name} {p.id === socket.id && "(Toi)"}</div>
                    <div className="text-xs uppercase mt-1">
                      {p.isAlive ? <span className="text-green-500">Vivant</span> : <span className="text-red-500">Mort</span>}
                    </div>
                  </div>
                  
                  {me?.isAlive && p.isAlive && p.id !== socket.id && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {gameState.phase === 'VOTE' && (
                        <button onClick={() => castVote(p.id)} className="w-full py-1 text-xs bg-game-blood rounded hover:bg-red-700">Voter</button>
                      )}
                      {gameState.phase === 'NIGHT' && myRole === 'WEREWOLF' && (
                        <button onClick={() => performAction('kill', p.id)} className="w-full py-1 text-xs bg-game-blood rounded hover:bg-red-700">Dévorer</button>
                      )}
                      {gameState.phase === 'NIGHT' && myRole === 'SEER' && (
                        <button onClick={() => performAction('see', p.id)} className="w-full py-1 text-xs bg-blue-600 rounded hover:bg-blue-700">Révéler</button>
                      )}
                      {gameState.phase === 'NIGHT' && myRole === 'WITCH' && (
                        <>
                          <button onClick={() => performAction('kill', p.id)} className="w-full py-1 text-xs bg-purple-600 rounded hover:bg-purple-700">Empoisonner</button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-game-blood/10 p-6 rounded-2xl border border-game-blood/20">
              <h4 className="font-bold mb-4 uppercase text-sm tracking-widest text-game-blood">État du Jeu</h4>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Phase :</span>
                  <span className="font-bold text-game-blood">{gameState.phase}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span>Jour :</span>
                  <span className="font-bold">{gameState.dayCount}</span>
                </div>
                <p className="text-gray-400 italic text-sm mt-4">
                  {gameState.phase === 'NIGHT' && "Les loups et les rôles spéciaux agissent dans l'ombre..."}
                  {gameState.phase === 'DAY' && "Discutez avec les autres joueurs pour démasquer les coupables."}
                  {gameState.phase === 'VOTE' && "Il est temps de voter pour éliminer un suspect !"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
