import { startBot } from "./services/wp-bot.service.js";
import schedule from "node-schedule";
import { getLastTournamentList, sendMessageToGroup, sendReminderToAllFromGroup } from "./services/wp-bot.utils.js";

process.on("uncaughtException", (err) => console.error("Erro não tratado:", err));
process.on("unhandledRejection", (reason, promise) => console.error("Promessa rejeitada sem catch:", reason));

schedule.scheduleJob("0 9 * * *", async () => {
  const sock = await startBot();
  try {
    const jid = process.env.JID_TESTE;
    await sendReminderToAllFromGroup(jid, sock);
    const lastList = getLastTournamentList(jid);
    if (lastList) {
      await sendMessageToGroup(jid, sock, { text: "Aqui vai a lista atualizada:" });
      await sendMessageToGroup(jid, sock, { text: lastList.text });
    }
  } catch (err) {
    console.error("❌ Erro ao executar tarefa:", err);
  } finally {
    await sock.ws.close();
  }
});
