import test from 'node:test';
import assert from 'node:assert/strict';
import {boardResult,newTicState,ticReducer,shuffled} from '../lib/love-games.ts';

test('hearts and kisses recognizes all eight winning lines for either player',()=>{
 for(const mark of [0,1])for(const line of [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]){
  const board=Array(9).fill(null);for(const i of line)board[i]=mark;
  assert.deepEqual(boardResult(board),{winner:mark,line,draw:false});
 }
});
test('completed games and occupied squares cannot change the score or turn',()=>{
 let s=newTicState();s=ticReducer(s,{type:'place',index:0});assert.equal(ticReducer(s,{type:'place',index:0}),s);
 for(const index of [3,1,4,2])s=ticReducer(s,{type:'place',index});
 assert.deepEqual(s.scores,[1,0]);assert.equal(ticReducer(s,{type:'place',index:8}),s);
 const next=ticReducer(s,{type:'round'});assert.equal(next.turn,1);assert.deepEqual(next.scores,[1,0]);assert.equal(next.board.every(x=>x===null),true);
 assert.deepEqual(ticReducer(next,{type:'reset'}),newTicState());
});
test('a full board can draw without assigning a win',()=>{
 let s=newTicState();for(const index of [0,1,2,4,3,5,7,6,8])s=ticReducer(s,{type:'place',index});
 assert.equal(boardResult(s.board).draw,true);assert.equal(s.draws,1);assert.deepEqual(s.scores,[0,0]);assert.equal(ticReducer(s,{type:'place',index:0}),s);
});
test('memory shuffling preserves all pairs and leaves its input unchanged',()=>{
 const cards=[0,1,2,3,4,5,6,7,0,1,2,3,4,5,6,7],copy=[...cards];const result=shuffled(cards);
 assert.deepEqual(cards,copy);assert.notEqual(result,cards);assert.equal(result.length,16);for(let i=0;i<8;i++)assert.equal(result.filter(x=>x===i).length,2);
});
