import * as crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';

/**
 * 企业微信回调加解密工具（纯函数）
 *
 * 企业微信回调使用 AES-256-CBC 加密消息体，
 * 并使用 SHA1 对 msg_signature 进行签名校验。
 *
 * XML 解析使用 fast-xml-parser。
 */

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  parseTagValue: false,
});

/**
 * SHA1 签名校验
 */
export function verifySignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
  signature: string,
): boolean {
  const arr = [token, timestamp, nonce, encrypt].sort();
  const str = arr.join('');
  const sha1 = crypto.createHash('sha1').update(str).digest('hex');
  return sha1 === signature;
}

/**
 * AES-256-CBC 解密
 */
export function decryptMessage(
  encrypt: string,
  encodingAesKey: string,
): { message: string; corpId: string } {
  const aesKey = Buffer.from(encodingAesKey + '=', 'base64');
  const iv = aesKey.subarray(0, 16);
  const encrypted = Buffer.from(encrypt, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
  decipher.setAutoPadding(false);

  let decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  // 去除 PKCS#7 padding
  const padLength = decrypted[decrypted.length - 1];
  decrypted = decrypted.subarray(0, decrypted.length - padLength);

  // 解析消息结构: [16 bytes random] [4 bytes msg_len] [msg] [corpId]
  const msgLen = decrypted.readUInt32BE(16);
  const message = decrypted.subarray(20, 20 + msgLen).toString('utf8');
  const corpId = decrypted.subarray(20 + msgLen).toString('utf8');

  return { message, corpId };
}

/**
 * 加密消息
 */
export function encryptMessage(
  message: string,
  corpId: string,
  encodingAesKey: string,
): string {
  const aesKey = Buffer.from(encodingAesKey + '=', 'base64');
  const iv = aesKey.subarray(0, 16);

  const random = crypto.randomBytes(16);
  const msgBuffer = Buffer.from(message, 'utf8');
  const msgLen = Buffer.alloc(4);
  msgLen.writeUInt32BE(msgBuffer.length, 0);
  const corpIdBuffer = Buffer.from(corpId, 'utf8');

  const plain = Buffer.concat([random, msgLen, msgBuffer, corpIdBuffer]);

  // PKCS#7 padding
  const blockSize = 32;
  const padLength = blockSize - (plain.length % blockSize);
  const padded = Buffer.concat([
    plain,
    Buffer.alloc(padLength, padLength),
  ]);

  const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
  cipher.setAutoPadding(false);

  const encrypted = Buffer.concat([
    cipher.update(padded),
    cipher.final(),
  ]);

  return encrypted.toString('base64');
}

/**
 * 解析企业微信回调的 XML 消息体（使用 fast-xml-parser）
 *
 * 加密 XML 格式：
 * <xml>
 *   <ToUserName><![CDATA[...]]></ToUserName>
 *   <Encrypt><![CDATA[...]]></Encrypt>
 *   <AgentID><![CDATA[...]]></AgentID>
 * </xml>
 *
 * 解密后的明文 XML 格式：
 * <xml>
 *   <ToUserName><![CDATA[...]]></ToUserName>
 *   <FromUserName><![CDATA[...]]></FromUserName>
 *   <CreateTime>...</CreateTime>
 *   <MsgType><![CDATA[event]]></MsgType>
 *   <Event><![CDATA[change_contact]]></Event>
 *   <ChangeType><![CDATA[create_user]]></ChangeType>
 *   <UserID><![CDATA[...]]></UserID>
 *   ...
 * </xml>
 *
 * 返回扁平化的 JSON 对象
 */
export function parseWeComXml(xml: string): Record<string, string> {
  try {
    const parsed = xmlParser.parse(xml);
    const root = parsed.xml || {};

    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(root)) {
      if (typeof value === 'string') {
        result[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        // CDATA 被解析为 { '#text': 'value' }
        const obj = value as any;
        result[key] =
          obj['#text'] !== undefined ? String(obj['#text']) : String(value);
      }
    }

    return result;
  } catch {
    return {};
  }
}
