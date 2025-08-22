import axios from "axios";
import { Address } from "viem";
import { SeiAgentKit } from "../../agent/index";


const MCP_API = "https://mcp.api.sei.io/v1/context";


export async function analyzeFarmingContext(agent: SeiAgentKit, wallet: Address): Promise<string> {
  try {
    const res = await axios.post(MCP_API, {
      wallet_address: wallet,
      model_ids: ["astroport_farms"],
    });

    const positions = res.data?.astroport_farms?.positions || [];

    if (positions.length === 0) {
      return `🧑‍🌾 No active farming positions found for \`${wallet}\`.\nYou either exited DeFi or you’re farming dust.`;
    }

    let summary = `🧑‍🌾 *Farming Analysis for:* \`${wallet}\`\n\n`;
    summary += `Found *${positions.length}* active farming positions:\n\n`;

    let totalUsd = 0;

    for (const pos of positions) {
      const { pool, apr, rewards_value_usd, value_usd } = pos;
      const aprPercent = (apr * 100).toFixed(2);
      const valUsd = parseFloat(value_usd || "0");
      const rewardUsd = parseFloat(rewards_value_usd || "0");

      totalUsd += valUsd;

      summary += `- *${pool}*\n  📈 APR: *${aprPercent}%*\n  💰 Value: $${valUsd.toFixed(2)} | Rewards: $${rewardUsd.toFixed(2)}\n\n`;
    }

    summary += `📊 *Total Value in Farms:* $${totalUsd.toFixed(2)}\n`;

    
    try {
      const aiComment = await agent.getAiResponse('farming_advisor', {
        wallet,
        farmingData: positions,
        summary,
      });

      summary += `\n🤖 *SEI-Sage Insight:*\n${aiComment}`;
    } catch (err) {
      console.warn("⚠️ AI farming advisor gagal:", err.message);
      summary += `\n\n🤖 AI lagi suntuk, insight unavailable.`;
    }

    return summary;

  } catch (err: any) {
    console.error("❌ Farming context error:", err?.response?.data || err.message);
    return `❌ Failed to fetch farming context. Either the MCP API is down or that wallet ain't farming.`;
  }
}
