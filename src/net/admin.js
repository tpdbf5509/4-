/* ── 관리 화면(?admin) ↔ RPG 방장 화면 연결 ─────────────────────────────
   서버마다 관리 채널 하나(flg:adm-RPG1 …)를 따로 둔다. 그 서버의 방장과 관리 화면만 붙는다.
   - 관리 화면이 ADMIN.ping 초마다 "ping" 을 보내면 방장이 "stat"(인원 · 방장 · 빌드 · fps)으로 답한다.
     답이 돌아오는 시간이 그 서버의 왕복 시간이다. 묻지 않으면 아무것도 보내지 않는다(메시지 한도)
   - 명령(방장 부여 · 퇴장)은 Supabase 함수로 받은 일회용 표(nonce)를 싣는다.
     방장 화면은 rpg_admin_redeem 으로 표가 맞는지 묻고 맞을 때만 따른다. 표와 함수는 supabase/rpg.sql */
import { joinRoom, supabase } from "./room.js";

export const ADMIN = {
  ping: 3,          // 관리 화면이 묻는 간격(초) — 서버당 3초에 2통(묻기 + 답)
  keep: 40,         // 왕복 시간 그래프에 남기는 점 수(= 2분)
  gone: 10,         // 이만큼(초) 답이 없으면 그 서버는 비었다고 본다
  page: 8,          // 인원 표 한 쪽에 보이는 사람 수
};

const rpc = async (fn, args) => {
  try {
    const { data, error } = await supabase().rpc(fn, args);
    return error ? { ok: false, err: "net" } : data;
  } catch {
    return { ok: false, err: "net" };
  }
};

// 관리자 확인 — 입장권을 바꾸지 않아 게임 중인 기기가 끊기지 않는다
export const adminCheck = (name, code) => rpc("rpg_admin_ok", { p_name: name, p_code: code });
// 명령 표 받기(60초 동안 한 번)
export const adminTicket = (name, code, server, act, target) =>
  rpc("rpg_admin_ticket", { p_name: name, p_code: code, p_server: server, p_act: act, p_target: target });
// 모든 계정(캐릭터) — 이름 · 레벨 · 직업 · 코인 · 명예 · 만든 때 · 마지막 저장 · 접속 중인 서버
export const adminAccounts = (name, code) => rpc("rpg_admin_accounts", { p_name: name, p_code: code });
// 저장 지킴에 막힌 기록(최근 100개) — 섞인 기록을 서버가 막은 때
export const adminBlocks = (name, code) => rpc("rpg_admin_blocks", { p_name: name, p_code: code });
// 방장 화면 — 받은 명령의 표가 맞는가
export const adminRedeem = async (nonce, server, act, target) =>
  (await rpc("rpg_admin_redeem", { p_nonce: nonce, p_server: server, p_act: act, p_target: target })) === true;

// 관리 채널에 붙는다 — 방장 화면과 관리 화면이 같이 쓴다
export const joinAdminLink = (server, id, name) => joinRoom(`adm-${server}`, { id, name });
