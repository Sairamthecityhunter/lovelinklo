'use client';

import {useReducer,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Heart,RotateCcw,Gamepad2,Users,LockKeyhole} from 'lucide-react';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {Progress} from '@/components/ui/progress';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {quizDecks,ratherQuestions,shuffled,boardResult,newTicState,ticReducer,type QuizQuestion} from '@/lib/love-games';

type Players=[string,string];
type AnswerRound={index:number;phase:'answer'|'handoff'|'guess'|'reveal'|'finished';answer:string;guess:string;matches:number;answered:number;skipped:number};
const freshAnswers=():AnswerRound=>({index:0,phase:'answer',answer:'',guess:'',matches:0,answered:0,skipped:0});

function Options({question,value,onChange,id}:{question:QuizQuestion;value:string;onChange:(s:string)=>void;id:string}){
 return <RadioGroup className="couple-game-options" aria-label="Choose an answer" value={value} onValueChange={onChange}>{question.options.map((option,i)=><label className={'couple-game-option '+(option===value?'chosen':'')} htmlFor={id+'-'+i} key={option}><RadioGroupItem id={id+'-'+i} value={option}/><span>{option}</span></label>)}</RadioGroup>;
}

export function AnswerGame({players,questions,title,mode,onExit}:{players:Players;questions:QuizQuestion[];title:string;mode:'quiz'|'rather';onExit:()=>void}){
 const [round,setRound]=useState(freshAnswers);
 const [choice,setChoice]=useState('');
 const subject=round.index%2,guesser=subject===0?1:0;
 const next=(skip=false)=>{setChoice('');setRound(r=>({...r,index:r.index+1,phase:r.index+1===questions.length?'finished':'answer',answer:'',guess:'',skipped:r.skipped+(skip?1:0)}));};
 if(round.phase==='finished')return <div className="card game-result" role="status"><span className="game-result-emoji">💞</span><p className="eyebrow">{title}</p><h2>{round.answered?`${round.matches} of ${round.answered} ${mode==='quiz'?'guesses matched':'choices matched'}`:'A little time together'}</h2><p>{mode==='quiz'?'Every answer is another little thing to learn about each other.':'Same choice or different, the conversation is the best part.'}</p>{round.skipped>0&&<p>{round.skipped} {round.skipped===1?'question':'questions'} skipped.</p>}<div className="button-row"><button className="primary-button" onClick={()=>{setRound(freshAnswers());setChoice('');}}><RotateCcw size={16}/>Play again</button><button className="outline-button" onClick={onExit}>Choose another {mode==='quiz'?'quiz':'game'}</button></div><small>Just for fun. This isn’t a relationship assessment.</small></div>;
 const question=questions[round.index];
 const prompt=question.prompt.replaceAll('{name}',players[subject]);
 const first=round.phase==='answer',second=round.phase==='guess';
 return <section className="card game-play-card" aria-label={title}>
  <div className="game-round-top"><button className="text-button" onClick={onExit}><ArrowLeft size={15}/>{mode==='quiz'?'Quiz decks':'Games'}</button><span>Question {round.index+1} of {questions.length}</span></div>
  <Progress value={round.index/questions.length*100} aria-label="Questions completed"/>
  <div className="game-question-content" aria-live="polite">
   {round.phase==='handoff'?<div className="game-handoff"><span className="game-large-icon"><LockKeyhole size={32}/></span><p className="eyebrow">ANSWER HIDDEN</p><h2>Your turn, {players[guesser]}.</h2><p>{mode==='quiz'?`Guess what ${players[subject]} chose.`:'Choose your own answer, then see how you match.'} Pass the phone or resume screen sharing.</p><button className="primary-button" onClick={()=>setRound(r=>({...r,phase:'guess'}))}>I’m ready <ArrowRight size={16}/></button></div>:<>
    <div className="game-turn"><span>{round.phase==='reveal'?'💬':first?'💌':'💭'}</span>{round.phase==='reveal'?'The reveal':first?`${players[subject]}, choose ${mode==='quiz'?'your answer':'first'}`:mode==='quiz'?`${players[guesser]}, make your guess`:`${players[guesser]}, your choice`}</div>
    <h2>{prompt}</h2>
    {first&&<p className="game-instruction">{mode==='quiz'?'Choose what feels most like you.':'Pick the one you would enjoy most.'} Keep it a surprise: ask your partner to look away, or pause screen sharing.</p>}
    {(first||second)&&<><Options question={question} value={choice} onChange={setChoice} id={mode+'-choice'}/><div className="game-actions"><button className="primary-button" disabled={!choice} onClick={()=>{if(first){setRound(r=>({...r,answer:choice,phase:'handoff'}));}else{setRound(r=>({...r,guess:choice,phase:'reveal',matches:r.matches+(r.answer===choice?1:0),answered:r.answered+1}));}setChoice('');}}>{first?'Hide my answer':'Reveal our answers'} <ArrowRight size={16}/></button><button className="text-button" onClick={()=>next(true)}>Skip question</button></div></>}
    {round.phase==='reveal'&&<><div className={'game-match-banner '+(round.answer===round.guess?'matched':'')}><span>{round.answer===round.guess?'✨':'💬'}</span>{round.answer===round.guess?'A little match!':'Something new to talk about.'}</div><div className="game-answer-reveal"><div><small>{players[subject]} chose</small><strong>{round.answer}</strong></div><div><small>{players[guesser]} {mode==='quiz'?'guessed':'chose'}</small><strong>{round.guess}</strong></div></div><div className="game-conversation"><small>KEEP THE CONVERSATION GOING</small><p>{question.followUp}</p></div><button className="primary-button" onClick={()=>next()}>{round.index+1===questions.length?'See our results':'Next question'} <ArrowRight size={16}/></button></>}
   </>}
  </div>
 </section>;
}

function QuizGame({players}:{players:Players}){
 const [deck,setDeck]=useState<string|null>(null);const selected=quizDecks.find(q=>q.id===deck);
 return selected?<AnswerGame key={selected.id} players={players} title={selected.title} questions={selected.questions} mode="quiz" onExit={()=>setDeck(null)}/>:<><div className="game-section-intro"><h2>How well do you know each other?</h2><p>One of you chooses a secret answer. The other guesses. Swap roles each question.</p></div><div className="quiz-decks">{quizDecks.map(d=><button className="card quiz-deck" key={d.id} onClick={()=>setDeck(d.id)}><span className="quiz-deck-icon">{d.emoji}</span><small>6 QUESTIONS · TAKE TURNS</small><h3>{d.title}</h3><p>{d.description}</p><span className="quiz-deck-start">Start quiz <ArrowRight size={17}/></span></button>)}</div></>;
}

function RatherGame({players}:{players:Players}){const [started,setStarted]=useState(false);return started?<AnswerGame players={players} questions={ratherQuestions} title="Would you rather?" mode="rather" onExit={()=>setStarted(false)}/>:<div className="card game-start-card"><span className="game-result-emoji">💭</span><h2>Would you rather?</h2><p>Twelve little choices. Pick independently, reveal both answers, and share the story behind your choice.</p><button className="primary-button" onClick={()=>setStarted(true)}>Let’s choose <ArrowRight size={16}/></button><small>No right answer. Just your kind of together.</small></div>;}

const memorySymbols=[{emoji:'🌹',name:'rose'},{emoji:'💌',name:'love letter'},{emoji:'🎁',name:'gift'},{emoji:'☕',name:'coffee'},{emoji:'🌙',name:'moon'},{emoji:'🎵',name:'music'},{emoji:'🍓',name:'strawberry'},{emoji:'🧸',name:'teddy bear'}];
type MemoryState={cards:number[];flipped:number[];matched:number[];attempts:number;turn:0|1};
const emptyMemory=():MemoryState=>({cards:[],flipped:[],matched:[],attempts:0,turn:0});
function memoryReducer(s:MemoryState,a:{type:'start';cards:number[]}|{type:'flip';index:number}|{type:'next'}):MemoryState{
 if(a.type==='start')return {...emptyMemory(),cards:a.cards};
 if(a.type==='next')return s.flipped.length===2?{...s,flipped:[],turn:s.turn===0?1:0}:s;
 if(s.cards[a.index]===undefined||s.flipped.length===2||s.flipped.includes(a.index)||s.matched.includes(a.index))return s;
 const flipped=[...s.flipped,a.index];const pair=flipped.length===2&&s.cards[flipped[0]]===s.cards[flipped[1]];
 return {...s,flipped,attempts:s.attempts+(flipped.length===2?1:0),matched:pair?[...s.matched,...flipped]:s.matched};
}
function MemoryGame({players}:{players:Players}){
 const [s,dispatch]=useReducer(memoryReducer,undefined,emptyMemory);
 const start=()=>dispatch({type:'start',cards:shuffled([...memorySymbols.keys(),...memorySymbols.keys()])});
 if(!s.cards.length)return <div className="card game-start-card"><span className="game-result-emoji">🧸</span><h2>Better together: memory match</h2><p>Find eight matching pairs as a team. Take turns flipping two cards, and help each other remember.</p><button className="primary-button" onClick={start}>Shuffle & play <ArrowRight size={16}/></button><small>One shared score. No timer.</small></div>;
 const finished=s.matched.length===s.cards.length;
 const isPair=s.flipped.length===2&&s.cards[s.flipped[0]]===s.cards[s.flipped[1]];
 return <section className="card game-play-card memory-game" aria-label="Memory match"><div className="game-round-top"><h2>Memory match</h2><span>{s.matched.length/2} / 8 pairs · {s.attempts} turns</span></div><p className="game-board-status" role="status">{finished?`You found every pair together in ${s.attempts} turns! 💞`:s.flipped.length===2?isPair?'A match! Keep those two.':'Remember those cards for next time.':`${players[s.turn]}’s turn — choose ${s.flipped.length?'one more card':'two cards'}.`}</p><div className="memory-board">{s.cards.map((symbol,i)=>{const visible=s.flipped.includes(i)||s.matched.includes(i),matched=s.matched.includes(i);return <button key={i} className={'memory-tile '+(visible?'face-up ':'')+(matched?'found':'')} onClick={()=>dispatch({type:'flip',index:i})} disabled={visible||s.flipped.length===2||finished} aria-label={`Card ${i+1}, ${visible?memorySymbols[symbol].name+(matched?', matched':''):'face down'}`}><small>{i+1}</small>{visible?<span>{memorySymbols[symbol].emoji}</span>:<Heart size={25}/>} {matched&&<Check size={13} className="memory-check"/>}</button>;})}</div><div className="game-actions">{s.flipped.length===2&&!finished&&<button className="primary-button" onClick={()=>dispatch({type:'next'})}>Next turn: {players[s.turn===0?1:0]} <ArrowRight size={16}/></button>}<button className={finished?'primary-button':'text-button'} onClick={start}><RotateCcw size={16}/>{finished?'Play again':'Restart with new cards'}</button></div></section>;
}

function TicGame({players}:{players:Players}){
 const [s,dispatch]=useReducer(ticReducer,undefined,newTicState);const result=boardResult(s.board),over=result.winner!==null||result.draw;
 return <section className="card game-play-card tic-game" aria-label="Hearts and kisses"><div className="game-round-top"><h2>Hearts & kisses</h2><span>2 players · 3 in a row</span></div><p className="game-instruction">Take turns. Get three of your symbols in a row, column, or diagonal.</p><div className="game-scoreboard"><div className={s.turn===0&&!over?'active':''}><span>❤️</span><strong>{players[0]}</strong><small>{s.scores[0]} {s.scores[0]===1?'win':'wins'}</small></div><div className={s.turn===1&&!over?'active':''}><span>💋</span><strong>{players[1]}</strong><small>{s.scores[1]} {s.scores[1]===1?'win':'wins'}</small></div></div><p className="game-board-status" role="status">{result.winner!==null?`${players[result.winner]} wins! ${result.winner===0?'❤️':'💋'}`:result.draw?'A draw! One more round?':`${players[s.turn]}’s turn ${s.turn===0?'❤️':'💋'}`}</p><div className="tic-board">{s.board.map((mark,i)=><button key={i} className={result.line.includes(i)?'winning':''} disabled={mark!==null||over} onClick={()=>dispatch({type:'place',index:i})} aria-label={`Row ${Math.floor(i/3)+1}, column ${i%3+1}: ${mark===null?'empty':mark===0?'heart':'kiss'}`}>{mark===null?'':mark===0?'❤️':'💋'}</button>)}</div><div className="game-actions"><button className="primary-button" onClick={()=>dispatch({type:'round'})}><RotateCcw size={16}/>{over?'Next round':'Restart round'}</button><span>{s.draws} {s.draws===1?'draw':'draws'}</span><button className="text-button" onClick={()=>dispatch({type:'reset'})}>Reset scores</button></div></section>;
}

export function GamesView({myName,partnerName}:{myName:string;partnerName:string}){
 const players:Players=[myName||'You',partnerName||'Your partner'];const [game,setGame]=useState('quiz');
 return <div className="couple-games"><div className="page-heading"><div><p className="eyebrow">A LITTLE TIME FOR TWO</p><h1>Couple games</h1><p>A few questions, a little friendly competition, and more reasons to smile.</p></div><span className="game-mode-label"><Users size={16}/>One screen · Two players</span></div><Tabs value={game} onValueChange={setGame}><TabsList className="couple-games-tabs" aria-label="Choose a couple game"><TabsTrigger value="quiz">💌 Couple quizzes</TabsTrigger><TabsTrigger value="rather">💭 Would you rather</TabsTrigger><TabsTrigger value="memory">🧸 Memory match</TabsTrigger><TabsTrigger value="tic">❤️ Hearts & kisses</TabsTrigger></TabsList><TabsContent value="quiz" forceMount hidden={game!=='quiz'}><QuizGame players={players}/></TabsContent><TabsContent value="rather" forceMount hidden={game!=='rather'}><RatherGame players={players}/></TabsContent><TabsContent value="memory" forceMount hidden={game!=='memory'}><MemoryGame players={players}/></TabsContent><TabsContent value="tic" forceMount hidden={game!=='tic'}><TicGame players={players}/></TabsContent></Tabs><div className="game-call-note"><Gamepad2 size={20}/><p><strong>Playing from different places?</strong> Share one person’s screen on your video call and take turns. Pause sharing for secret answers. Games run on this device; moves don’t sync between phones. Rounds reset when you leave this section or refresh.</p></div></div>;
}
