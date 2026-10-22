export const DEMO_NAME='Leo · Demo';
export function demoReply(message:string){
 const text=message.toLowerCase();
 if(/\b(hi|hello|hey)\b/.test(text))return 'Hey! 👋 Nice to meet you. What do you enjoy doing together?';
 if(/\b(music|dance|song)\b/.test(text))return 'A music date sounds fun! Try Melody square and press Dance. I’ll join you 🎶';
 if(/\b(cafe|café|coffee|tea)\b/.test(text))return 'Let’s meet at Together café ☕ Use its travel button and I’ll come along.';
 if(/\b(beach|ocean|sea)\b/.test(text))return 'The beach is a lovely spot for a chat. Tap Love beach and let’s explore 🏖️';
 if(/\b(hobby|hobbies|like|interest)\b/.test(text))return 'For this sample conversation, I like music, travel, and games. What about you?';
 if(/\b(real|human|demo|bot|ai)\b/.test(text))return 'I’m a scripted demo character, not a real person or an AI chat service. In a live room, the other person types their own replies.';
 if(/\b(how|talk|chat|message)\b/.test(text))return 'Type here and press Send. Your message appears in the chat and above your avatar. In a live room, your partner sees it and can reply.';
 if(/\b(love|heart)\b/.test(text))return 'A little kindness goes a long way ❤️ Try the Heart button to show a gesture above your avatar.';
 if(/\b(bye|goodbye)\b/.test(text))return 'Thanks for trying the demo! Use Leave, then enter a couple room or find a match to talk with a real person 👋';
 return 'This is a sample reply so you can try the chat. Ask about music, coffee, or how to talk—or explore a place with me!';
}
