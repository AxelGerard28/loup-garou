import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Role } from './types';
import { Users, Moon, Sun, ArrowLeft, LogIn, PlusCircle, Send, Heart, Skull, SkipForward } from 'lucide-react';

// REMPLACEZ CETTE URL par celle de votre service Render
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
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
      // Only clear actionResult on phase changes, but Witch needs to keep it during her turn
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
  }, [gameState?.messages]);

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
        <div className="bg-red-900/20 border border-red-500/50 p-8 rounded-xl text-center max-w-md shadow-2xl">
          <h2 className="text-2xl font-bold text-red-500 mb-4">Erreur de Connexion</h2>
          <p className="text-gray-300 mb-6 italic">Tentative de reconnexion au village...</p>
          <div className="animate-pulse text-sm text-gray-400">Le serveur est peut-être en train de démarrer...</div>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-game-dark to-game-night">
        <h1 className="text-7xl font-bold mb-12 text-game-blood tracking-widest uppercase text-center drop-shadow-[0_5px_15px_rgba(139,0,0,0.5)]">Loup Garou</h1>
        <div className="bg-white/10 p-10 rounded-2xl backdrop-blur-xl w-full max-w-lg shadow-2xl border border-white/10 space-y-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">Ton Nom</label>
            <input
              type="text"
              placeholder="Ex: Geralt..."
              className="w-full p-5 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-game-blood transition-all text-lg"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={createGame}
              className="flex flex-col items-center justify-center p-6 bg-game-blood/20 hover:bg-game-blood/40 border border-game-blood/30 rounded-xl transition-all group"
            >
              <PlusCircle className="mb-3 text-game-blood group-hover:scale-110 transition-transform" size={32} />
              <span className="font-bold uppercase tracking-wider text-sm">Créer</span>
            </button>
            <div className="flex flex-col space-y-2">
              <input
                type="text"
                placeholder="Code"
                className="w-full p-4 bg-black/40 border border-white/10 rounded-xl text-white text-center focus:outline-none focus:ring-2 focus:ring-game-blood font-mono uppercase tracking-widest"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
              />
              <button
                onClick={joinGame}
                disabled={!roomCode}
                className="flex items-center justify-center gap-2 p-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all font-bold uppercase text-sm"
              >
                <LogIn size={18} /> Rejoindre
              </button>
            </div>
          </div>
        </div>
        <p className="mt-8 text-gray-500 text-sm italic">Créez un salon ou entrez le code d'un ami pour jouer.</p>
      </div>
    );
  }

  if (!gameState) return <div className="flex items-center justify-center min-h-screen text-2xl animate-pulse tracking-widest uppercase">Entrée dans le village...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <header className="flex flex-wrap justify-between items-center gap-4 bg-white/5 p-6 rounded-2xl border border-white/10">
        <div>
          <h2 className="text-3xl font-black text-game-blood uppercase tracking-tighter">Village de Loup-Garou</h2>
          <p className="text-xs text-gray-400 font-mono tracking-widest uppercase mt-1">Salon: <span className="text-white bg-white/10 px-2 py-0.5 rounded">{roomCode}</span></p>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2 border border-white/5">
            <Users size={20} className="text-game-blood" /> <span className="font-bold">{gameState.players.length}</span> <span className="text-xs text-gray-400">Joueurs</span>
          </span>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            {gameState.phase === 'NIGHT' ? <Moon className="text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]" /> : <Sun className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" />}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-8 flex-1 overflow-hidden">
        <div className="lg:col-span-3 space-y-8 overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/5">
          {gameState.phase === 'LOBBY' && (
            <div className="grid md:grid-cols-2 gap-8 animate-in fade-in duration-500">
              <div className="bg-white/5 p-8 rounded-2xl border border-white/10 shadow-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 border-b border-white/5 pb-4 uppercase tracking-widest text-gray-400">
                  Liste des Joueurs
                </h3>
                <ul className="space-y-4">
                  {gameState.players.map((p) => (
                    <li key={p.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/5 group hover:bg-white/10 transition-all">
                      <span className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${p.isReady ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        <span className="font-bold text-lg">{p.name}</span>
                        {p.isHost && <span className="text-[10px] bg-game-blood px-2 py-0.5 rounded-full font-black uppercase tracking-tighter">Host</span>}
                      </span>
                      <span className={`text-xs font-black tracking-widest uppercase ${p.isReady ? "text-green-400" : "text-gray-500"}`}>
                        {p.isReady ? "Prêt" : "Attente"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex flex-col justify-center items-center gap-8 bg-white/5 p-8 rounded-2xl border border-white/10 border-dashed">
                <div className="text-center space-y-2">
                  <p className="text-gray-400 text-sm uppercase tracking-[0.2em]">Partagez le code</p>
                  <p className="text-5xl font-black text-white tracking-widest bg-white/5 px-6 py-4 rounded-2xl border border-white/10">{roomCode}</p>
                </div>
                <button
                  onClick={toggleReady}
                  className={`w-full py-6 rounded-2xl font-black text-2xl transition-all shadow-xl active:scale-95 ${
                    me?.isReady ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' : 'bg-white/10 hover:bg-white/20 border border-white/10'
                  }`}
                >
                  {me?.isReady ? "JE SUIS PRÊT !" : "SE PRÉPARER"}
                </button>
                {me?.isHost && (
                  <button
                    onClick={startGame}
                    disabled={gameState.players.length < 4}
                    className="w-full py-6 bg-game-blood hover:bg-red-700 disabled:opacity-30 disabled:cursor-not-allowed rounded-2xl font-black text-2xl uppercase tracking-widest shadow-2xl shadow-game-blood/40 transition-all active:scale-95"
                  >
                    Lancer (4+ joueurs)
                  </button>
                )}
              </div>
            </div>
          )}

          {gameState.phase === 'END' && (
            <div className="text-center py-24 bg-white/5 rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in duration-500">
              <h2 className="text-8xl font-black mb-6 text-game-blood tracking-tighter uppercase drop-shadow-[0_0_20px_rgba(139,0,0,0.6)]">VICTOIRE !</h2>
              <p className="text-4xl mb-12 font-bold tracking-tight">Les {gameState.winner === 'WEREWOLVES' ? 'Loups-Garous' : 'Villageois'} l'emportent.</p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 px-8">
                {gameState.players.map(p => (
                  <div key={p.id} className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="font-bold">{p.name}</p>
                    <p className="text-xs text-game-blood font-black uppercase">{p.role}</p>
                  </div>
                ))}
              </div>

              {me?.isHost ? (
                <button onClick={restartGame} className="px-12 py-6 bg-game-blood hover:bg-red-700 rounded-2xl font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-game-blood/40 active:scale-95">Rejouer</button>
              ) : (
                <div className="bg-white/5 inline-block px-8 py-4 rounded-xl border border-white/10 text-gray-400 italic">En attente de l'hôte pour relancer...</div>
              )}
            </div>
          )}

          {gameState.phase !== 'LOBBY' && gameState.phase !== 'END' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className={`bg-white/5 p-8 rounded-3xl border border-white/10 relative overflow-hidden transition-all duration-500 ${!me?.isAlive ? 'opacity-40 grayscale' : 'shadow-2xl'}`}>
                <div className={`absolute -top-10 -right-10 p-4 font-black uppercase tracking-tighter text-[10rem] opacity-5 rotate-12 select-none`}>
                  {myRole}
                </div>
                <div className="relative z-10">
                  <h3 className="text-sm font-black text-game-blood uppercase tracking-[0.4em] mb-2">Ton Rôle Secret</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-5xl font-black tracking-tighter uppercase">{myRole}</span>
                    {!me?.isAlive && <span className="bg-red-600 px-3 py-1 rounded text-xs font-black uppercase tracking-widest">Éliminé</span>}
                  </div>
                  <p className="text-gray-400 italic text-lg max-w-lg leading-relaxed mb-6">
                    {myRole === 'WEREWOLF' && "Infiltrez le village. Chaque nuit, choisissez une victime avec vos semblables. Le jour, mentez pour survivre."}
                    {myRole === 'VILLAGER' && "Observez, discutez et déduisez. Votre seule arme est votre voix lors du conseil du village."}
                    {myRole === 'SEER' && "Utilisez vos pouvoirs psychiques pour révéler la véritable nature d'un joueur chaque nuit."}
                    {myRole === 'WITCH' && "Maîtresse de la vie et de la mort. Vous possédez deux potions uniques pour changer le destin."}
                  </p>
                  
                  {gameState.phase === 'NIGHT' && (
                    <div className="bg-black/40 p-4 rounded-2xl border border-white/5 inline-block">
                      <p className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                        Phase de nuit : <span className="text-blue-400">{gameState.nightSubPhase}</span>
                      </p>
                      {isMyTurn ? (
                        <p className="text-green-400 text-xs mt-1 font-bold">C'est à VOUS de jouer !</p>
                      ) : (
                        <p className="text-gray-500 text-xs mt-1 italic">Attendez que le rôle termine son action...</p>
                      )}
                    </div>
                  )}

                  {actionResult && (
                    <div className="mt-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-2xl text-blue-200 font-bold animate-in bounce-in">
                      {myRole === 'WITCH' ? `🧪 Grimoire : ${actionResult}` : `🔮 Vision : ${actionResult}`}
                    </div>
                  )}
                </div>
              </div>

              {gameState.phase === 'DAY' && (
                <div className="bg-yellow-900/10 p-6 rounded-2xl border border-yellow-500/20 text-yellow-200 flex items-center gap-4 animate-in slide-in-from-left">
                  <Sun size={24} className="animate-spin-slow" />
                  <p className="font-bold text-lg">
                    {gameState.lastDeath === 'Personne' ? "Le village s'éveille sans perte." : `Triste nouvelle : ${gameState.lastDeath} ne s'est pas réveillé ce matin.`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {gameState.players.map(p => (
                  <div key={p.id} className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between group ${
                    p.isAlive ? 'bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/[0.07]' : 'bg-red-950/20 border-red-900/20 opacity-60 grayscale'
                  } ${me?.votedFor === p.id ? 'ring-4 ring-green-500 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]' : ''}`}>
                    <div className="relative">
                      <div className="font-black text-lg truncate mb-1">{p.name} {p.id === socket.id && <span className="text-game-blood text-[10px] ml-1 tracking-tighter">(TOI)</span>}</div>
                      <div className="text-[10px] uppercase font-bold tracking-widest">
                        {p.isAlive ? <span className="text-green-500 flex items-center gap-1"><div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div> Vivant</span> : (
                          <span className="text-red-500 flex items-center gap-2">
                            MORT <span className="text-white/40 italic font-normal">({p.role})</span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {me?.isAlive && p.isAlive && (
                      <div className={`mt-6 flex flex-col gap-2 transition-all duration-300 ${isMyTurn || gameState.phase === 'VOTE' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                        {gameState.phase === 'VOTE' && p.id !== socket.id && (
                          <button onClick={() => castVote(p.id)} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-game-blood text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20">Voter contre</button>
                        )}
                        {isMyTurn && myRole === 'WEREWOLF' && p.id !== socket.id && (
                          <button onClick={() => performAction('kill', p.id)} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-game-blood text-white rounded-lg hover:bg-red-700 transition-colors">Dévorer</button>
                        )}
                        {isMyTurn && myRole === 'SEER' && p.id !== socket.id && (
                          <button onClick={() => performAction('see', p.id)} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Observer</button>
                        )}
                        {isMyTurn && myRole === 'WITCH' && (
                          <div className="space-y-2">
                            {gameState.witchHasDeathPotion && p.id !== socket.id && (
                              <button onClick={() => performAction('kill', p.id)} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                                <Skull size={12} /> Empoisonner
                              </button>
                            )}
                            {gameState.witchHasLifePotion && actionResult?.includes(p.name) && (
                              <button onClick={() => performAction('save')} className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                <Heart size={12} /> Sauver
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {isMyTurn && myRole === 'WITCH' && (
                <button onClick={() => performAction('skip')} className="mt-4 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-[0.2em] border border-white/10 transition-all flex items-center gap-2">
                  <SkipForward size={14} /> Ne rien faire / Terminer tour
                </button>
              )}
            </div>
          )}
        </div>

        <aside className="space-y-8 h-full flex flex-col min-h-[500px] max-h-screen">
          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col flex-1">
            <h4 className="font-black mb-4 uppercase text-xs tracking-[0.4em] text-game-blood border-b border-white/5 pb-4 shrink-0">Conseil du Village</h4>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4 scrollbar-thin scrollbar-thumb-white/10 min-h-0">
              {gameState.messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.senderId === socket.id ? 'items-end' : 'items-start'}`}>
                  <span className="text-[10px] font-bold text-gray-500 mb-1">{msg.senderName}</span>
                  <div className={`p-3 rounded-2xl text-sm max-w-[90%] break-words ${msg.senderId === socket.id ? 'bg-game-blood text-white' : 'bg-white/10 text-gray-200'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChat} className="relative shrink-0">
              <input
                type="text"
                placeholder={me?.isAlive ? "Message..." : "Éliminé"}
                disabled={!me?.isAlive || gameState.phase === 'NIGHT'}
                className="w-full p-4 pr-12 bg-black/40 border border-white/10 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-game-blood disabled:opacity-30 transition-all"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button
                type="submit"
                disabled={!chatInput.trim() || !me?.isAlive || gameState.phase === 'NIGHT'}
                className="absolute right-2 top-2 p-2 text-game-blood hover:scale-110 disabled:opacity-0 transition-all"
              >
                <Send size={20} />
              </button>
            </form>
          </div>

          <div className="bg-white/5 p-6 rounded-3xl border border-white/10 shrink-0">
             <div className="flex justify-between items-center group mb-4">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Phase</span>
                <span className="font-black text-game-blood bg-game-blood/10 px-3 py-1 rounded-lg text-sm tracking-tighter uppercase">{gameState.phase}</span>
              </div>
              <div className="flex justify-between items-center group">
                <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">Jour</span>
                <span className="font-black text-xl tracking-tighter">{gameState.dayCount}</span>
              </div>
          </div>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-4 text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 hover:text-white transition-all flex items-center justify-center gap-2 hover:bg-white/5 rounded-2xl border border-transparent hover:border-white/5 shrink-0"
          >
            <ArrowLeft size={14} /> Quitter
          </button>
        </aside>
      </div>
    </div>
  );
}

export default App;
