import { WebClient } from '@slack/web-api';
import 'dotenv/config';

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const YOUR_USER_ID = process.env.SLACK_YOUR_USER_ID;

export async function sendDM(agentName, message) {
	try {
		console.log(`[${agentName}] Attempting to send DM to user ID: ${YOUR_USER_ID}`);
		console.log(`[${agentName}] Bot token starts with: ${process.env.SLACK_BOT_TOKEN?.substring(0, 15)}...`);

		const result = await client.chat.postMessage({
			channel: YOUR_USER_ID,
			text: message,
		});

		console.log(`[${agentName}] Slack DM sent successfully, ts: ${result.ts}`);
	} catch (error) {
		console.error(`[${agentName}] Slack DM error:`, error.message);
		console.error(`[${agentName}] Slack error code:`, error.data);
		throw error;
	}
}

export async function sendToChannel(agentName, channelId, message) {
	try {
		await client.chat.postMessage({
	 channel: channelId,
	 text: message,
		});
		console.log(`[${agentName}] Slack channel message sent successfully`);
	} catch (error) {
		console.error(`[${agentName}] Slack channel error:`, error.message);
		throw error;
	}
}

export async function getChannelHistory(agentName, channelId, limit = 50) {
	try {
		const result = await client.conversations.history({
	 channel: channelId,
	 limit,
		});
		console.log(`[${agentName}] Fetched ${result.messages.length} messages from Slack`);
		return result.messages;
	} catch (error) {
		console.error(`[${agentName}] Slack history error:`, error.message);
		throw error;
	}
}
