import type {QuizQuestion} from './love-games';
export const premiumDecks:{id:string;title:string;emoji:string;questions:QuizQuestion[]}[]=[
 {id:'future',title:'Our next chapter',emoji:'🗺️',questions:[
 {prompt:'What would {name} choose for a shared adventure?',options:['A road trip','A cooking course','A hiking weekend','A new city'],followUp:'What would make that adventure feel special?'},
 {prompt:'What small ritual would {name} most enjoy?',options:['Sunday breakfast','An evening walk','A monthly date','A bedtime check-in'],followUp:'When could you try it together?'},
 {prompt:'What kind of home would {name} choose?',options:['City apartment','Country cottage','Beach house','Mountain cabin'],followUp:'What would your favorite corner look like?'},
 {prompt:'Which skill would {name} learn together?',options:['Dancing','Cooking','A language','Photography'],followUp:'What would be fun about being beginners together?'},
 {prompt:'What would {name} save for first?',options:['A journey','A shared home','A big celebration','A new experience'],followUp:'What small step could help you start?'},
 {prompt:'What makes a future plan exciting for {name}?',options:['New experiences','Time together','A little surprise','Making memories'],followUp:'Tell each other one hope for the next year.'}]},
 {id:'smallthings',title:'The little things',emoji:'🫶',questions:[
 {prompt:'What comforts {name} after a long day?',options:['A hug','Quiet company','Talking it through','Something delicious'],followUp:'How could you offer that comfort this week?'},
 {prompt:'Which surprise would {name} treasure?',options:['A handwritten note','A homemade meal','A planned date','A favorite snack'],followUp:'What is a small surprise you still remember?'},
 {prompt:'How would {name} spend a slow morning?',options:['Sleeping in','Coffee and a book','A gentle walk','Making breakfast'],followUp:'Design a slow morning for the two of you.'},
 {prompt:'What makes {name} feel appreciated?',options:['Kind words','Thoughtful help','Focused time','A little gift'],followUp:'Name one thing you appreciated recently.'},
 {prompt:'What does {name} notice first on a date?',options:['The conversation','The atmosphere','The food','The thought behind it'],followUp:'Which date would you happily repeat?'},
 {prompt:'Which memory would {name} put in a keepsake?',options:['Our first meeting','An ordinary happy day','A big adventure','A moment of support'],followUp:'Share the story behind your answer.'}]},
];
