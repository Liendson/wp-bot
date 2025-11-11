import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import pino from "pino";
import dotenv from "dotenv";
import schedule from "node-schedule";
import { getJIDByName, isMessageReply, isMessageValid, replyToSender, sendMessageToAllFromGroup, updateProfilePicture } from "./wp-bot.utils.js";

dotenv.config();

const onConnectionUpdate = (update, sock) => {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    qrcode.generate(qr, { small: true });
  }

  if (connection === "close") {
    const reason = lastDisconnect?.error?.output?.statusCode;
    if (reason !== DisconnectReason.loggedOut) {
      startBot();
    }
  }

  if (connection === "open") {
    // schedule.scheduleJob("*/1 * * * *", async () => updateProfilePicture(process.env.JID_SNAKE, "./src/images/torneios-calango.png"));s
    schedule.scheduleJob("*/1 * * * *", async () => sendMessageToAllFromGroup(await getJIDByName("Grupo teste", sock), sock));
  }
}

const onMessageUpsert = async (msgUpdate, sock) => {

  const msg = msgUpdate.messages[0];
  const from = msg.key.remoteJid;

  if (!isMessageValid(msgUpdate, from, sock)) {
    return;
  }

  if (isMessageReply(msg, sock)) {
    return replyToSender(msg, sock);
  }
  
}

export async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: true,
    syncFullHistory: false,
    auth: state,
    logger: pino({ level: "warn" }),
  });

  console.log("📱 Conta conectada:", sock.user);

  sock.ev.on("messages.upsert", (msgUpdate) => onMessageUpsert(msgUpdate, sock));
  sock.ev.on("connection.update", (msgUpdate) => onConnectionUpdate(msgUpdate, sock));
  sock.ev.on("creds.update", saveCreds);

}