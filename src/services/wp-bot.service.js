import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import dotenv from "dotenv";

import { getJIDByName, getLastTournamentList, isCommandMessage, isMessageReply, isMessageValid, replyToSender, sendMessageToGroup, storeIfTournamentList } from "./wp-bot.utils.js";

dotenv.config();

const onConnectionUpdate = (update) => {
  const { qr } = update;

  if (qr) {
    qrcode.generate(qr, { small: true });
  }
  
}

const onMessageUpsert = async (msgUpdate, sock) => {

  const msg = msgUpdate.messages[0];
  const jid = await getJIDByName("Grupo teste", sock)

  if (!isMessageValid(msgUpdate, msg.key.remoteJid, sock)) {
    return;
  }

  if (isMessageReply(msg, sock)) {
    return replyToSender(msg, sock);
  }

  if (isCommandMessage(msg, sock) && getLastTournamentList(jid)) {
    return await sendMessageToGroup(jid, sock, { text: getLastTournamentList(jid).text });
  }

  storeIfTournamentList(msg, jid);
}

export const startBot = async () => {
  const { state } = await useMultiFileAuthState("./auth_info");
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    syncFullHistory: false,
    auth: state,
    logger: pino({ level: "warn" }),
  });

  await new Promise((resolve, reject) => {
    sock.ev.on("connection.update", (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === "open") {
        resolve();
      }

      if (connection === "close") {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;

        if (!shouldReconnect) {
          reject("Não autenticado");
        }
      }
    });
  });

  return sock;
};
