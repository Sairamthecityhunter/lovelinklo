export const PIN_TYPES = ["Wish", "Message", "Gift", "Call", "Date", "Surprise", "Birthday", "Anniversary", "Trip", "Custom"] as const;
export type PinType = typeof PIN_TYPES[number];
export const TYPE_EMOJI: Record<PinType, string> = {Wish:"❤️",Message:"💌",Gift:"🎁",Call:"📞",Date:"📅",Surprise:"🌹",Birthday:"🎂",Anniversary:"💍",Trip:"✈️",Custom:"⭐"};
export const REMINDERS = [{label:"30 days before",value:43200},{label:"14 days before",value:20160},{label:"7 days before",value:10080},{label:"3 days before",value:4320},{label:"1 day before",value:1440},{label:"12 hours before",value:720},{label:"6 hours before",value:360},{label:"3 hours before",value:180},{label:"1 hour before",value:60},{label:"30 minutes before",value:30},{label:"15 minutes before",value:15},{label:"5 minutes before",value:5},{label:"At the exact time",value:0}];
export const TIMEZONES = ["America/Los_Angeles","America/New_York","America/Chicago","America/Toronto","America/Sao_Paulo","Europe/London","Europe/Paris","Europe/Berlin","Africa/Johannesburg","Asia/Kolkata","Asia/Dubai","Asia/Singapore","Asia/Tokyo","Australia/Sydney","Pacific/Auckland","UTC"];
export type Repeat = "none" | "daily" | "weekly" | "monthly" | "yearly";
export type View = "home" | "us" | "pins" | "calendar" | "gifts" | "wishlist" | "memories" | "letters" | "plans" | "settings" | "surprises" | "about" | "games" | "world" | "shop" | "concierge" | "together";
export interface Pin {id:string;title:string;message:string;type:PinType;dueAt:string;timezone:string;reminderMinutes:number;repeat:Repeat;anchorDay?:number;eventId:string;letterId?:string;secret:boolean;done:boolean;snoozedUntil?:string;notifiedAt?:string;createdAt:string;ownerId?:string;}
export interface LoveEvent {id:string;title:string;date:string;timezone:string;type:PinType;annual:boolean;secret:boolean;ownerId?:string;}
export interface MediaAsset {url:string;kind:"image"|"video"|"audio";caption:string;}
export interface Surprise {id:string;title:string;message:string;date:string;timezone:string;assets:MediaAsset[];playlist:string;secret:boolean;ownerId?:string;}
export interface Memory {id:string;title:string;date:string;place:string;note:string;image:string;mediaKind?:"image"|"video"|"audio";secret:boolean;ownerId?:string;}
export interface Letter {id:string;title:string;body:string;date:string;openWhen:string;secret:boolean;ownerId?:string;}
export interface Goal {id:string;title:string;targetDate:string;progress:number;category:string;completed:boolean;secret:boolean;ownerId?:string;}
export interface WishlistItem {id:string;productId:string;title:string;price:number;image:string;category:string;secret:boolean;ownerId?:string;}
export interface Order {id:string;productId:string;title:string;price:number;image:string;deliveryDate:string;status:string;secret:boolean;ownerId?:string;demo:boolean;}
export interface Notice {id:string;title:string;body:string;pinId:string;createdAt:string;read:boolean;ownerId?:string;}
export interface Profile {myName:string;partnerName:string;myTimezone:string;partnerTimezone:string;togetherSince:string;longDistance:boolean;browserNotifications:boolean;notificationPrivacy:boolean;sample:boolean;interests:string;budget:number;location:string;}
export interface LoveState {viewerId?:string;profile:Profile;surprises:Surprise[];pins:Pin[];events:LoveEvent[];memories:Memory[];letters:Letter[];goals:Goal[];wishlist:WishlistItem[];orders:Order[];notifications:Notice[];connected:boolean;revision:number;}
export type Collection = "surprises"|"pins"|"events"|"memories"|"letters"|"goals"|"wishlist"|"orders"|"notifications";
export interface Product {id:string;title:string;subtitle:string;price:number;image:string;category:string;tags:string[];shippingDays:number;processingDays:number;rating:number;}
