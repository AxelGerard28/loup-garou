import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Role } from './types';
import { Users, Moon, Sun, ArrowLeft, LogIn, PlusCircle, Send, Heart, Skull, MessageSquare, LayoutGrid } from 'lucide-react';

const SOCKET_URL = 'https://loup-garou-01al.onrender.com'; 
const socket: Socket = io(SOCKET_URL);

function App() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myRole, setMyRole] = useState<Role | null>(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'game' | 'chat'>('game');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
      if (state.phase !== 'NIGHT') setActionResult(null);
    });
    socket.on('roleAssigned', (role: Role) => setMyRole(role));
    socket.on('actionResult', (msg: string) => setActionResult(msg));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameStateUpdate');
      socket.off('roleAssigned');
      socket.off('actionResult');
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState?.messages, activeTab]);

  const createGame = () => {
    if (name.trim()) {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      setRoomCode(code);
      socket.emit('joinRoom', { roomCode: code, name });
      setJoined(true);
    }
  };

  const joinGame = () => {
    if (name.trim() && roomCode.trim()) {
      socket.emit('joinRoom', { roomCode: roomCode.toUpperCase(), name });
      setJoined(true);
    }
  };

  const toggleReady = () => socket.emit('readyUp');
  const startGame = () => socket.emit('startGame');
  const restartGame = () => socket.emit('resetGame');
  const performAction = (action: string, targetId?: string) => socket.emit('roleAction', action, targetId);
  const castVote = (targetId: string) => socket.emit('vote', targetId);
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socket.emit('sendMessage', chatInput);
      setChatInput('');
    }
  };

  const me = gameState?.players.find(p => p.id === socket.id);
  const isMyTurn = gameState?.phase === 'NIGHT' && gameState?.nightSubPhase === myRole;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-game-dark">
        <div className="bg-red-900/20 border border-red-500/50 p-6 sm:p-8 rounded-xl text-center max-w-md shadow-2xl">
          <h2 className="text-xl sm:text-2xl font-bold text-red-500 mb-4">Erreur de Connexion</h2>
          <p className="text-gray-300 mb-6 italic text-sm">Tentative de reconnexion au village...</p>
          <div className="animate-pulse text-xs text-gray-400">Le serveur est peut-être en train de démarrer...</div>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-game-dark to-game-night">
        <h1 className="text-5xl sm:text-7xl font-bold mb-8 sm:mb-12 text-game-blood tracking-widest uppercase text-center drop-shadow-[0_5px_15px_rgba(139,0,0,0.5)] px-4">Loup Garou</h1>
        <div className="bg-white/10 p-6 sm:p-10 rounded-2xl backdrop-blur-xl w-full max-w-lg shadow-2xl border border-white/10 space-y-6 sm:space-y-8">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-1">Ton Nom</label>
            <input
              type="text"
              placeholder="Geralt..."
              className="w-full p-4 sm:p-5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-game-blood transition-all text-base sm:text-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={createGame}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-game-blood/20 hover:bg-game-blood/40 border border-game-blood/30 rounded-xl transition-all group order-2 sm:order-1"
            >
              <PlusCircle className="mb-2 sm:mb-3 text-game-blood group-hover:scale-110 transition-transform" size={28} />
              <span className="font-bold uppercase tracking-wider text-xs">Créer</span>
            </button>
            <div className="flex flex-col space-y-2 order-1 sm:order-2">
              <input
                type="text"
                placeholder="Code"
                className="w-full p-3 sm:p-4 bg-black/40 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-game-blood font-mono uppercase tracking-widest text-sm"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <button
                onClick={joinGame}
                disabled={!roomCode}
                className="flex items-center justify-center gap-2 p-3 sm:p-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all font-bold uppercase text-xs"
              >
                <LogIn size={16} /> Rejoindre
              </button>
            </div>
          </div>
        </div>
        <p className="mt-8 text-gray-500 text-xs italic text-center px-4">Entrez un code ou créez un salon pour jouer.</p>
      </div>
    );
  }

  if (!gameState) return <div className="flex items-center justify-center min-h-screen text-xl sm:text-2xl animate-pulse tracking-widest uppercase">Entrée dans le village...</div>;

  return (
    <div className="h-screen flex flex-col bg-game-dark text-white overflow-hidden">
      {/* HEADER COMPACT RESPONSIVE */}
      <header className="p-3 sm:p-4 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-lg sm:text-xl font-black text-game-blood uppercase tracking-tighter leading-none">Loup-Garou</h2>
          <div className="hidden sm:block text-[10px] text-gray-500 font-mono tracking-widest uppercase">
            Salon: <span className="text-white bg-white/10 px-2 py-0.5 rounded">{roomCode}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="sm:hidden text-[10px] text-white font-mono bg-white/10 px-2 py-1 rounded">#{roomCode}</div>
          <div className="flex items-center gap-1 sm:gap-2 bg-white/5 px-2 py-1 rounded-lg text-xs">
            <Users size={14} className="text-game-blood" /> 
            <span className="font-bold">{gameState.players.length}</span>
          </div>
          <div className={`p-1.5 rounded-lg border border-white/5 ${gameState.phase === 'NIGHT' ? 'bg-blue-900/20 text-blue-400' : 'bg-yellow-900/20 text-yellow-400'}`}>
            {gameState.phase === 'NIGHT' ? <Moon size={16} /> : <Sun size={16} />}
          </div>
        </div>
      </header>

      {/* MOBILE TABS */}
      <div className="lg:hidden flex border-b border-white/10 bg-black/20 shrink-0">
        <button 
          onClick={() => setActiveTab('game')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'game' ? 'bg-white/5 text-game-blood border-b-2 border-game-blood' : 'text-gray-500'}`}
        >
          <LayoutGrid size={16} /> Jeu
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-white/5 text-game-blood border-b-2 border-game-blood' : 'text-gray-500'}`}
        >
          <MessageSquare size={16} /> Chat
        </button>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* GAME VIEW */}
        <main className={`flex-1 p-4 lg:p-6 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/5 ${activeTab !== 'game' && 'hidden lg:block'}`}>
          {gameState.phase === 'LOBBY' && (
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6 animate-in fade-in duration-500">
              <div className="bg-white/5 p-5 rounded-2xl border border-white/10 shadow-xl">
                <h3 className="text-sm font-black mb-4 uppercase tracking-[0.2em] text-gray-400 border-b border-white/5 pb-2">Villageois arrivés</h3>
                <ul className="space-y-2">
                  {gameState.players.map((p) => (
                    <li key={p.id} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                      <span className="flex items-center gap-2 truncate">
                        <div className={`shrink-0 w-1.5 h-1.5 rounded-full ${p.isReady ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="font-bold text-sm truncate">{p.name}</span>
                        {p.isHost && <span className="text-[7px] bg-game-blood px-1.5 py-0.5 rounded-full font-black uppercase">Host</span>}
                      </span>
                      <span className={`text-[8px] font-black uppercase ${p.isReady ? "text-green-400" : "text-gray-500"}`}>
                        {p.isReady ? "Prêt" : "Attente"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex flex-col justify-center items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10 border-dashed">
                <div className="text-center">
                  <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Code du salon</p>
                  <p className="text-3xl font-black text-white tracking-widest bg-white/5 px-5 py-2 rounded-xl border border-white/10">{roomCode}</p>
                </div>
                <button
                  onClick={toggleReady}
                  className={`w-full py-4 rounded-xl font-black text-lg transition-all active:scale-95 ${
                    me?.isReady ? 'bg-green-600 hover:bg-green-700 shadow-green-900/10' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {me?.isReady ? "JE SUIS PRÊT !" : "SE PRÉPARER"}
                </button>
                {me?.isHost && (
                  <button
                    onClick={startGame}
                    disabled={gameState.players.length < 4}
                    className="w-full py-4 bg-game-blood hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-xl font-black text-lg uppercase tracking-widest shadow-lg shadow-game-blood/20 transition-all"
                  >
                    Lancer (4+)
                  </button>
                )}
              </div>
            </div>
          )}

          {gameState.phase === 'END' && (
            <div className="max-w-4xl mx-auto text-center py-10 bg-white/5 rounded-3xl border border-white/10 shadow-2xl">
              <h2 className="text-5xl sm:text-7xl font-black mb-3 text-game-blood tracking-tighter uppercase">VICTOIRE !</h2>
              <p className="text-xl sm:text-2xl mb-8 font-bold text-gray-300">Les {gameState.winner === 'WEREWOLVES' ? 'Loups-Garous' : 'Villageois'} l'emportent.</p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 px-4 max-w-2xl mx-auto">
                {gameState.players.map(p => (
                  <div key={p.id} className={`p-3 rounded-xl border text-left ${p.isAlive ? 'bg-white/10 border-white/20' : 'bg-black/20 border-white/5 opacity-50'}`}>
                    <p className="font-bold text-xs truncate">{p.name}</p>
                    <p className="text-[8px] text-game-blood font-black uppercase mt-0.5">{p.role}</p>
                  </div>
                ))}
              </div>

              {me?.isHost ? (
                <button onClick={restartGame} className="px-8 py-4 bg-game-blood hover:bg-red-700 rounded-xl font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl">Rejouer</button>
              ) : (
                <div className="text-gray-500 text-xs italic">En attente de l'hôte...</div>
              )}
            </div>
          )}

          {gameState.phase !== 'LOBBY' && gameState.phase !== 'END' && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* RÔLE SECRET */}
              <div className={`bg-white/5 p-5 sm:p-6 rounded-2xl border border-white/10 relative overflow-hidden transition-all duration-500 ${!me?.isAlive ? 'opacity-40 grayscale' : 'shadow-xl'}`}>
                <div className={`absolute -top-4 -right-4 font-black uppercase tracking-tighter text-6xl opacity-5 rotate-12 select-none`}>
                  {myRole}
                </div>
                <div className="relative z-10">
                  <h3 className="text-[8px] font-black text-game-blood uppercase tracking-[0.3em] mb-1">Mon Rôle</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl sm:text-3xl font-black tracking-tighter uppercase">{myRole}</span>
                    {!me?.isAlive && <span className="bg-red-600 px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest">Éliminé</span>}
                  </div>
                  
                  {gameState.phase === 'NIGHT' && (
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 inline-block mb-3">
                      <p className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                        Phase : <span className="text-blue-400">{gameState.nightSubPhase}</span>
                      </p>
                    </div>
                  )}

                  {actionResult && (
                    <div className="p-3 bg-blue-900/30 border border-blue-500/30 rounded-xl text-blue-200 text-xs sm:text-sm font-bold animate-in bounce-in">
                      {myRole === 'WITCH' ? `🧪 Grimoire : ${actionResult}` : `🔮 Vision : ${actionResult}`}
                    </div>
                  )}
                </div>
              </div>

              {/* NEWS FLASH */}
              {gameState.phase === 'DAY' && (
                <div className="bg-yellow-900/10 p-4 rounded-xl border border-yellow-500/20 text-yellow-200 flex items-center gap-3 text-xs sm:text-sm font-bold">
                  <Sun size={16} className="animate-spin-slow shrink-0" />
                  <p className="truncate">
                    {gameState.lastDeath === 'Personne' ? "Nuit calme au village." : `${gameState.lastDeath} n'est plus.`}
                  </p>
                </div>
              )}

              {/* GRID DES JOUEURS - RESPONSIVE 2 COL SUR MOBILE */}
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {gameState.players.map(p => {
                  const isTargetOfMyVote = me?.votedFor === p.id;
                  return (
                    <div key={p.id} className={`p-3 sm:p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between min-h-[90px] group ${
                      p.isAlive ? 'bg-white/5 border-white/10 active:bg-white/10' : 'bg-red-950/10 border-red-900/10 opacity-50 grayscale'
                    } ${isTargetOfMyVote ? 'ring-2 sm:ring-4 ring-green-500 border-green-500 shadow-lg' : ''}`}>
                      <div className="min-w-0">
                        <div className="font-black text-sm sm:text-base truncate leading-tight">{p.name} {p.id === socket.id && <span className="text-game-blood text-[7px] block tracking-tighter">TOI</span>}</div>
                        <div className="text-[7px] sm:text-[9px] uppercase font-bold tracking-widest mt-1">
                          {p.isAlive ? <span className="text-green-500 flex items-center gap-1 leading-none"><div className="w-1 h-1 bg-green-500 rounded-full"></div> Vivant</span> : (
                            <span className="text-red-500 flex items-center gap-1 leading-none">MORT <span className="text-white/40 font-normal italic">({p.role})</span></span>
                          )}
                        </div>
                      </div>
                      
                      {me?.isAlive && p.isAlive && (
                        <div className={`mt-3 flex flex-col gap-1 transition-opacity ${isMyTurn || gameState.phase === 'VOTE' ? 'opacity-100' : 'opacity-0 lg:group-hover:opacity-100'}`}>
                          {gameState.phase === 'VOTE' && p.id !== socket.id && (
                            <button onClick={() => castVote(p.id)} className={`w-full py-1.5 text-[8px] font-black uppercase rounded-lg ${isTargetOfMyVote ? 'bg-green-600' : 'bg-game-blood'}`}>
                              {isTargetOfMyVote ? 'Voté' : 'Voter'}
                            </button>
                          )}
                          {isMyTurn && myRole === 'WEREWOLF' && p.id !== socket.id && (
                            <button onClick={() => performAction('kill', p.id)} className="w-full py-1.5 text-[8px] font-black uppercase bg-game-blood rounded-lg">Dévorer</button>
                          )}
                          {isMyTurn && myRole === 'SEER' && p.id !== socket.id && (
                            <button onClick={() => performAction('see', p.id)} className="w-full py-1.5 text-[8px] font-black uppercase bg-blue-600 rounded-lg">Observer</button>
                          )}
                          {isMyTurn && myRole === 'WITCH' && (
                            <div className="grid grid-cols-1 gap-1">
                              {gameState.witchHasDeathPotion && p.id !== socket.id && (
                                <button onClick={() => performAction('kill', p.id)} className="w-full py-1.5 text-[7px] font-black uppercase bg-purple-600 rounded-lg flex items-center justify-center gap-1">
                                  <Skull size={10} /> Mort
                                </button>
                              )}
                              {gameState.witchHasLifePotion && actionResult?.includes(p.name) && (
                                <button onClick={() => performAction('save')} className="w-full py-1.5 text-[7px] font-black uppercase bg-green-600 rounded-lg flex items-center justify-center gap-1">
                                  <Heart size={10} /> Vie
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {isMyTurn && myRole === 'WITCH' && (
                <button onClick={() => performAction('skip')} className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">Terminer mon tour</button>
              )}
            </div>
          )}
        </main>

        {/* CHAT VIEW - FIXED HEIGHT & ASIDE ON LG */}
        <aside className={`lg:w-80 xl:w-96 p-4 lg:p-6 bg-black/20 lg:border-l border-white/10 flex flex-col min-h-0 ${activeTab !== 'chat' && 'hidden lg:flex'}`}>
          <div className="flex-1 bg-white/5 rounded-2xl border border-white/10 shadow-2xl flex flex-col min-h-0">
            <h4 className="p-4 uppercase text-[10px] font-black tracking-[0.4em] text-game-blood border-b border-white/5 shrink-0 flex justify-between items-center">
              Conseil du Village
              <span className="bg-game-blood/20 text-game-blood px-2 py-0.5 rounded text-[8px] tracking-normal">{gameState.messages.length} msg</span>
            </h4>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/10 min-h-0">
              {gameState.messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 text-center px-4">
                  <MessageSquare size={32} className="mb-2 opacity-20" />
                  <p className="text-[10px] uppercase tracking-widest">Le silence règne...</p>
                </div>
              )}
              {gameState.messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.senderId === socket.id ? 'items-end' : 'items-start'}`}>
                  <span className="text-[8px] font-bold text-gray-500 mb-0.5 px-1">{msg.senderName}</span>
                  <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] break-words ${msg.senderId === socket.id ? 'bg-game-blood text-white' : 'bg-white/10 text-gray-200'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="p-3 bg-black/20 shrink-0 border-t border-white/5">
              <div className="relative">
                <input
                  type="text"
                  placeholder={me?.isAlive ? (gameState.phase === 'NIGHT' ? "Nuit..." : "Parler...") : "Mort"}
                  disabled={!me?.isAlive || gameState.phase === 'NIGHT'}
                  className="w-full p-3 pr-10 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-game-blood disabled:opacity-20 transition-all"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || !me?.isAlive || gameState.phase === 'NIGHT'}
                  className="absolute right-2 top-2 p-1.5 text-game-blood hover:scale-110 disabled:opacity-0 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </div>

          <div className="mt-4 hidden lg:block bg-white/5 p-4 rounded-xl border border-white/10 shrink-0">
            <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
              <span className="text-gray-500">Jour</span>
              <span>{gameState.dayCount}</span>
            </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 w-full py-3 text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 hover:text-white transition-all flex items-center justify-center gap-2 hover:bg-white/5 rounded-xl shrink-0"
          >
            <ArrowLeft size={12} /> Quitter
          </button>
        </aside>
      </div>
    </div>
  );
}

export default App;
