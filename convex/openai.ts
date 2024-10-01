import OpenAI from "openai";
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("OPENAI_API_KEY is not set in environment variables");
}
const openai = new OpenAI({ apiKey });

export const chat = action({
	args: {
		messageBody: v.string(),
		conversation: v.id("conversations"),
	},
	handler: async (ctx, args) => {
		console.log("Chat action started");
		console.log("API Key (first 5 chars):", process.env.OPENAI_API_KEY?.slice(0, 5));
		
		try {
			console.log("Starting OpenAI chat request with message:", args.messageBody);
			
			const res = await openai.chat.completions.create({
				model: "gpt-3.5-turbo",
				messages: [
					{
						role: "system",
						content: "You are a helpful assistant in a group chat responding to questions concisely.",
					},
					{
						role: "user",
						content: args.messageBody,
					},
				],
			});

			console.log("OpenAI API response received");
			// console.log("Response status:", res.status);
			console.log("Response data:", JSON.stringify(res, null, 2));

			const messageContent = res.choices[0].message.content;

			console.log("Sending ChatGPT message");
			await ctx.runMutation(api.message.sendChatGPTMessage, {
				content: messageContent ?? "I'm sorry, I don't have a response for that",
				conversation: args.conversation,
				messageType: "text",
			});
			console.log("ChatGPT message sent successfully");
		} catch (error) {
			console.error("Error in OpenAI chat action:", error);
			
			let errorMessage = "I'm sorry, there was an error processing your request. Please try again later.";
			
			if (error instanceof Error) {
				console.error("Error name:", error.name);
				console.error("Error message:", error.message);
				console.error("Error stack:", error.stack);
				
				// Check for quota exceeded error
				if (error.message.includes("You exceeded your current quota") || 
					error.message.includes("Billing hard limit has been reached")) {
					errorMessage = "I'm sorry, but the AI service is currently unavailable due to usage limits. Please try again later or contact the administrator.";
				}
			}
			
			if (typeof error === 'object' && error !== null) {
				console.error("Full error object:", JSON.stringify(error, null, 2));
			}
			
			await ctx.runMutation(api.message.sendChatGPTMessage, {
				content: errorMessage,
				conversation: args.conversation,
				messageType: "text",
			});
		}
	},
});

// export const dall_e = action({
// 	args: {
// 		conversation: v.id("conversations"),
// 		messageBody: v.string(),
// 	},
// 	handler: async (ctx, args) => {
// 		const res = await openai.images.generate({
// 			model: "dall-e-3",
// 			prompt: args.messageBody,
// 			n: 1,
// 			size: "1024x1024",
// 		});

// 		const imageUrl = res.data[0].url;
// 		await ctx.runMutation(api.message.sendChatGPTMessage, {
// 			content: imageUrl ?? "/poopenai.png",
// 			conversation: args.conversation,
// 			messageType: "image",
// 		});
// 	},
// });

// 1 token ~= 4 chars in English
// 1 token ~= ¾ words
// 100 tokens ~= 75 words
// Or
// 1-2 sentence ~= 30 tokens
// 1 paragraph ~= 100 tokens
// 1,500 words ~= 2048 tokens

// 1 image will cost $0,04(4 cents) => dall-e-3
// 1 image will cost $0,02(2 cents) => dall-e-2