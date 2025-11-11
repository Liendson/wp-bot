import fs from "fs";
import { generateByPrompt } from "./ia.service.js";

const sentMessages = new Set();

/**
 * Obtém o JID do grupo de acordo com o nome informado, caso não exista, retorna null
 *
 * @param {string} nome - Nome do grupo, em string.
 * @param {object} sock - Instância atual do socket Baileys
 * @returns {string} - o id, caso encontre, ou null.
 */
export const getJIDByName = async (nome, sock) => {
  const groups = await sock.groupFetchAllParticipating();
  const group = Object.values(groups).find(g => g.subject === nome);
  return group ? group.id : null;
};

/**
 * Responde a uma mensagem respondida pelo bot. marcando quem respondeu.
 *
 * @param {object} msg - Mensagem recebida do Baileys (msgUpdate.messages[0])
 * @param {object} sock - Instância atual do socket Baileys
 */
export const replyToSender = async (msg, sock) => {
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
  await sendAndTrack(sock, msg.key.remoteJid, {
    text: text ? await generateByPrompt(text) : "Opa, não entendi sua mensagem!",
    contextInfo: {
      stanzaId: msg.key.id,
      participant: msg.key.participant || msg.key.remoteJid,
      quotedMessage: msg.message,
    },
  });
}

/**
 * Verifica se a mensagem é válida para ser respondida.
 * Ela só deve ser válida, caso exista, caso o tipo dela seja "notify" e caso não tenha sido enviada pelo próprio Bot.
 * Serve para evitar que responda ou execute alguma ação indevida ou desnecessária.
 *
 * @param {object} msgUpdate - Mensagem recebida do Baileys (msgUpdate)
 * @param {object} from - A pessoa que está enviando a mensagem
 * @param {object} sock - Instância atual do socket Baileys
 */
export const isMessageValid = (msgUpdate, from, sock) => {
  const msg = msgUpdate.messages[0];
  const messageExists = () => {
    return msg.message && (msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption) || "";
  }
  if (messageExists() && msgUpdate.type == "notify") {
    const fromMe = msg.key.fromMe || msg.participant === sock.user?.id;
    return !fromMe || !(from === sock.user.id || from.endsWith("@broadcast") || from.includes("status"));
  }
  return false;
}

/**
 * Verifica se uma mensagem é resposta (reply) a uma mensagem enviada pelo bot.
 *
 * @param {object} msg - Mensagem recebida do Baileys (msgUpdate.messages[0])
 * @param {object} sock - Instância atual do socket Baileys
 */
export const isMessageReply = (msg) => {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  if (!contextInfo?.stanzaId) return false;

  // se o id citado for de uma mensagem enviada pelo bot
  return sentMessages.has(contextInfo.stanzaId);
};

/**
 * Altera a imagem de capa de um grupo.
 *
 * @param {string} jid - JID do grupo a ter a imagem alterada
 * @param {string} urlImage - URL local da imagem
 */
export const updateProfilePicture = async (jid, urlImage) => {
  try {
    await sock.updateProfilePicture(jid, fs.readFileSync(urlImage));
  } catch (err) {
    console.error("❌ Erro ao alterar imagem automática:", err);
  }
}

/**
 * Envia uma mensagem em um grupo, marcando todos os participantes.
 *
 * @param {string} jid - JID do grupo a ter a imagem alterada
 * @param {object} sock - Instância atual do socket Baileys
 */
export const sendMessageToAllFromGroup = async (jid, sock) => {

  const getCaption = () => {
    switch (new Date().getDay()) {
      case 6: return "BOM DIA BOM DIA! YUGINHO JOTAPINHO Passando pra avisar que SEXTOU! Amanhã tem torneio, lembre-se de colocar o nome na lista pra mostrar pra galera que o torneio vai bombar!";
      default: return "Fala, Duelistas! YUGINHO JOTAPINHO Passando pra avisar que SÁBADO tem torneio! Lembre-se de colocar o nome na lista pra mostrar pra galera que o torneio vai bombar!";;
    }
  }

  const metadata = await sock.groupMetadata(jid);
  const mentionedJid = metadata.participants.map(p => p.id);

  await sendAndTrack(sock, jid, {
    image: fs.readFileSync("./src/images/yugi-feliz.jfif"),
    caption: getCaption(),
    contextInfo: { mentionedJid }
  });
}

export const sendAndTrack = async (sock, jid, content) => {
  const sent = await sock.sendMessage(jid, content);
  if (sent?.key?.id) {
    sentMessages.add(sent.key.id);
  }
  return sent;
};