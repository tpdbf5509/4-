/* ── 관리 화면 「데이터 시스템」 — four-lane.vercel.app/?admin ─────────────────
   관리자 캐릭터의 이름 + 코드로만 열린다(코드는 이 화면의 메모리에만 두고 저장하지 않는다).
   RPG 서버마다 방장 화면에 ADMIN.ping 초마다 묻고, 답으로 인원 · 방장 · 왕복 시간을 그린다.
   방장 부여 · 퇴장은 일회용 명령 표를 받아 그 서버의 방장 화면에 보낸다(src/net/admin.js) */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RPG_SERVERS, JOB_BY_ID } from "./game/rpg.js";
import { UPDATES } from "./game/updates.js";
import { GUIDE, GUIDE_GROUPS, GUIDE_HOW } from "./game/codeGuideData.js";
import SNIPS from "./game/codeGuideSnippets.json";
import { myId } from "./net/room.js";
import { ADMIN, adminTrades, adminAccounts, adminFeedback, adminRename, adminBlocks, adminCheck, adminTicket, joinAdminLink } from "./net/admin.js";
import "./ui/admin.css";

const TABS = [["people", "인원"], ["accounts", "계정"], ["trades", "거래"], ["inquiry", "문의"], ["log", "로그"], ["updates", "업뎃 기록"], ["servers", "서버"], ["guide", "코드 가이드"]];
const LOG_MAX = 300;                 // 로그에 남기는 줄 수(이 화면을 연 동안만)
const BLOCKS_EVERY = 30;             // 로그 탭을 보는 동안 막힌 저장 기록을 다시 읽는 간격(초)
const WHY = { name: "기록 이름이 다름", down: "레벨이 내려감", jump: "레벨이 너무 뜀", moved: "넘긴 물품이 다시 나타남", coins: "코인이 너무 늚" };
const coinText = (n) => (n === null || n === undefined ? "숫자 아님" : Number(n).toLocaleString("ko-KR"));
const CONFIRM_MS = 3000;             // 퇴장 · 방장 부여는 한 번 더 눌러야 한다 — 이 시간 안에
const srvName = (s) => `서버 ${RPG_SERVERS.indexOf(s) + 1}`;
const clock = (t) => { const d = new Date(t); return [d.getHours(), d.getMinutes(), d.getSeconds()].map((v) => String(v).padStart(2, "0")).join(":"); };
const errOf = (r) => (!r ? "연결이 끊겼습니다" : r.err === "locked" ? `잠시 막혔습니다. ${r.wait}초 뒤에 다시 해 주세요` :
  r.err === "wrong" ? `이름이나 코드가 맞지 않습니다${r.left ? ` (남은 기회 ${r.left}번)` : ""}` :
  r.err === "bad" ? "잘못된 명령입니다" : "연결이 끊겼습니다");

export default function AdminView() {
  const [auth, setAuth] = useState(null);           // { name, code } — 메모리에만
  if (!auth) return <AdminLogin onOk={setAuth} />;
  return <AdminBoard auth={auth} onOut={() => setAuth(null)} />;
}

function AdminLogin({ onOk }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const go = async (e) => {
    e.preventDefault();
    if (busy || !name.trim() || !code) return;
    setBusy(true); setErr("");
    const r = await adminCheck(name.trim(), code);
    setBusy(false);
    if (r && r.ok) onOk({ name: r.name, code });
    else setErr(errOf(r));
  };
  return (
    <div className="adm">
      <header className="adm-top"><h1>데이터 시스템</h1></header>
      <form className="adm-login" onSubmit={go}>
        <p className="adm-label">관리자 캐릭터로 들어갑니다</p>
        <label>이름<input value={name} onChange={(e) => setName(e.target.value)} maxLength={8} autoComplete="off" /></label>
        <label>코드<input value={code} onChange={(e) => setCode(e.target.value)} type="password" inputMode="numeric" maxLength={12} autoComplete="off" /></label>
        {err && <p className="adm-err">{err}</p>}
        <button className="adm-go" disabled={busy}>{busy ? "확인 중…" : "들어가기"}</button>
      </form>
    </div>
  );
}

function AdminBoard({ auth, onOut }) {
  const me = useMemo(() => `adm${myId()}`, []);
  const [tab, setTab] = useState("people");
  const [srv, setSrv] = useState(RPG_SERVERS[0]);
  const [page, setPage] = useState(0);
  const [stats, setStats] = useState({});            // 서버 → 마지막 답(+ at 받은 때)
  const [rtt, setRtt] = useState({});                // 서버 → [{ t, ms }]
  const [log, setLog] = useState([]);
  const [now, setNow] = useState(() => Date.now());
  const [ask, setAsk] = useState(null);              // 한 번 더 누르기를 기다리는 단추 — "act:id"
  const [busy, setBusy] = useState("");
  const [blocks, setBlocks] = useState(null);         // 저장 지킴에 막힌 기록 — 서버에 남아 있다
  const links = useRef({});
  const prev = useRef({});                           // 서버 → 지난번 답(로그를 만들 때 견준다)
  const waits = useRef(new Map());                   // 명령 cid → 기다리는 정보

  const note = useCallback((server, text, kind = "") => {
    setLog((l) => [{ t: Date.now(), server, text, kind }, ...l].slice(0, LOG_MAX));
  }, []);

  // 로그 탭 — 서버가 막은 저장 기록(섞인 기록)을 읽는다
  useEffect(() => {
    if (tab !== "log") return;
    const read = () => adminBlocks(auth.name, auth.code).then((r) => setBlocks(r && r.ok ? r.list : []));
    read();
    const t = setInterval(read, BLOCKS_EVERY * 1000);
    return () => clearInterval(t);
  }, [tab, auth]);

  // 서버마다 관리 채널에 붙어 묻고 답을 모은다
  useEffect(() => {
    const ls = {};
    RPG_SERVERS.forEach((s) => {
      const link = joinAdminLink(s, me, "관리 화면");
      ls[s] = link;
      link.on("stat", (d) => {
        if (!d || d.srv !== s || !Array.isArray(d.people)) return;
        const at = Date.now();
        const ms = typeof d.t === "number" ? Math.max(0, Math.round(performance.now() - d.t)) : null;
        // 로그 — 들어옴 · 나감 · 방장 바뀜
        const old = prev.current[s];
        const name = (id, list) => (list.find((p) => p.id === id) || {}).name || id;
        if (!old || at - old.at > ADMIN.gone * 1000) note(s, `서버가 열렸습니다 · ${d.people.length}명`);
        else {
          const was = new Set(old.people.map((p) => p.id)), is = new Set(d.people.map((p) => p.id));
          d.people.forEach((p) => { if (!was.has(p.id)) note(s, `${p.name} 들어옴 · Lv ${p.lv} ${p.job}`); });
          old.people.forEach((p) => { if (!is.has(p.id)) note(s, `${p.name} 나감`); });
          if (old.host !== d.host) note(s, `방장 바뀜 · ${name(old.host, old.people)} → ${name(d.host, d.people)}`, "host");
        }
        prev.current[s] = { ...d, at };
        setStats((o) => ({ ...o, [s]: { ...d, at } }));
        if (ms !== null) setRtt((o) => ({ ...o, [s]: [...(o[s] || []), { t: at, ms }].slice(-ADMIN.keep) }));
      });
      link.on("done", (d) => {
        const w = d && waits.current.get(d.cid);
        if (!w) return;
        waits.current.delete(d.cid);
        setBusy("");
        note(s, d.ok ? `${w.label} 완료 · ${w.name}` : `${w.label} 실패 · ${w.name} · ${d.why || ""}`, d.ok ? "ok" : "bad");
      });
    });
    links.current = ls;
    const ping = () => RPG_SERVERS.forEach((s) => ls[s].send("ping", { t: performance.now() }));
    const first = setTimeout(ping, 600);             // 채널이 붙을 틈
    const tick = setInterval(ping, ADMIN.ping * 1000);
    const clk = setInterval(() => setNow(Date.now()), 1000);
    // 서버가 오래 답이 없으면 비었다고 적는다
    const gone = setInterval(() => {
      const t = Date.now();
      RPG_SERVERS.forEach((s) => {
        const o = prev.current[s];
        if (o && !o.closed && t - o.at > ADMIN.gone * 1000) { o.closed = true; note(s, "답이 없습니다 · 비었거나 방장이 바뀌는 중"); }
      });
    }, 1000);
    return () => {
      clearTimeout(first); clearInterval(tick); clearInterval(clk); clearInterval(gone);
      RPG_SERVERS.forEach((s) => ls[s].leave());
    };
  }, [me, note]);

  const live = (s) => stats[s] && now - stats[s].at < ADMIN.gone * 1000;
  const cur = live(srv) ? stats[srv] : null;
  const people = cur ? cur.people : [];
  const pages = Math.max(1, Math.ceil(people.length / ADMIN.page));
  const pg = Math.min(page, pages - 1);
  const shown = people.slice(pg * ADMIN.page, (pg + 1) * ADMIN.page);
  const total = RPG_SERVERS.reduce((n, s) => n + (live(s) ? stats[s].people.length : 0), 0);
  const series = rtt[srv] || [];
  const lastMs = series.length && live(srv) ? series[series.length - 1].ms : null;

  // 명령 — 첫 누름은 "한 번 더", 두 번째에 명령 표를 받아 방장 화면에 보낸다
  const command = async (act, p) => {
    const key = `${act}:${p.id}`;
    if (ask !== key) { setAsk(key); setTimeout(() => setAsk((a) => (a === key ? null : a)), CONFIRM_MS); return; }
    setAsk(null);
    const label = act === "host" ? "방장 부여" : "퇴장";
    setBusy(key);
    const r = await adminTicket(auth.name, auth.code, srv, act, p.id);
    if (!r || !r.ok) { setBusy(""); note(srv, `${label} 실패 · ${errOf(r)}`, "bad"); return; }
    const cid = Math.random().toString(36).slice(2, 10);
    waits.current.set(cid, { label, name: p.name });
    links.current[srv].send("cmd", { nonce: r.nonce, act, target: p.id, cid });
    setTimeout(() => {
      if (!waits.current.has(cid)) return;
      waits.current.delete(cid); setBusy("");
      note(srv, `${label} 답 없음 · ${p.name}`, "bad");
    }, 8000);
  };

  return (
    <div className="adm">
      <header className="adm-top">
        <h1>데이터 시스템</h1>
        <span className="adm-who">{auth.name}<button onClick={onOut}>나가기</button></span>
      </header>

      <nav className="adm-tabs">
        {TABS.map(([id, label]) => (
          <button key={id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {(tab === "people" || tab === "servers") && (
        <div className="adm-srvs">
          {RPG_SERVERS.map((s) => (
            <button key={s} className={srv === s ? "on" : ""} onClick={() => { setSrv(s); setPage(0); }}>
              {srvName(s)}<b>{live(s) ? stats[s].people.length : "—"}</b>
            </button>
          ))}
        </div>
      )}

      {tab === "people" && (
        <section className="adm-sec">
          <RttChart series={series} now={now} />
          <p className="adm-meta">
            {srvName(srv)} · 시각 {clock(now)} · 왕복 {lastMs !== null ? `${lastMs}ms` : "—"}
          </p>
          <p className="adm-count">현재 접속 중인 인원: <b>{people.length}명</b><span>전체 {total}명</span></p>
          {!cur && <p className="adm-empty">이 서버는 비어 있거나 답이 없습니다.</p>}
          {cur && (
            <div className="adm-rows">
              <div className="adm-row head"><span>이름</span><span>접속 id</span><span>레벨</span><span>위치</span><span /></div>
              {shown.map((p) => {
                const isHost = p.id === cur.host;
                return (
                  <div className="adm-row" key={p.id}>
                    <span className="nm">{p.name}<em>{p.job}</em></span>
                    <span className="id">{p.id}</span>
                    <span>Lv {p.lv}</span>
                    <span className="map">{p.map}</span>
                    <span className="acts">
                      {isHost
                        ? <i className="adm-tag host">현재 방장</i>
                        : <button className="adm-btn give" disabled={!!busy} onClick={() => command("host", p)}>
                            {busy === `host:${p.id}` ? "보내는 중" : ask === `host:${p.id}` ? "한 번 더" : "방장 부여"}</button>}
                      <button className="adm-btn kick" disabled={!!busy} onClick={() => command("kick", p)}>
                        {busy === `kick:${p.id}` ? "보내는 중" : ask === `kick:${p.id}` ? "한 번 더" : "퇴장"}</button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {pages > 1 && (
            <div className="adm-pager">
              <button disabled={pg <= 0} onClick={() => setPage(pg - 1)}>‹</button>
              <span>{pg + 1}/{pages}</span>
              <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>›</button>
            </div>
          )}
        </section>
      )}

      {tab === "accounts" && <AccountsTab auth={auth} onOut={onOut} />}

      {tab === "trades" && <TradesTab auth={auth} />}
      {tab === "inquiry" && <InquiryTab auth={auth} />}
      {tab === "log" && (
        <section className="adm-sec">
          <p className="adm-count">저장을 막은 기록<span>섞인 기록을 서버가 막았습니다. 그 사람은 코드를 다시 넣으면 서버 기록으로 이어 합니다</span></p>
          {blocks && !blocks.length && <p className="adm-empty">막은 기록이 없습니다.</p>}
          {blocks && blocks.length > 0 && (
            <ul className="adm-log">
              {blocks.map((b, i) => (
                <li key={`${b.at}-${i}`} className="bad">
                  <time>{clock(Date.parse(b.at))}</time><span>{new Date(b.at).getMonth() + 1}/{new Date(b.at).getDate()}</span>
                  <p>{b.name} · {WHY[b.why] || b.why} · Lv {b.old} → {b.new}{b.why === "coins" ? ` · 코인 ${coinText(b.cold)} → ${coinText(b.cnew)}` : ""}{b.sent && b.sent !== b.name ? ` · 보낸 기록 이름 ${b.sent}` : ""}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="adm-count">이 화면의 기록<span>이 화면을 연 뒤의 기록입니다. 닫으면 지워집니다</span></p>
          {!log.length && <p className="adm-empty">아직 기록이 없습니다.</p>}
          <ul className="adm-log">
            {log.map((l, i) => (
              <li key={`${l.t}-${i}`} className={l.kind}><time>{clock(l.t)}</time><span>{srvName(l.server)}</span><p>{l.text}</p></li>
            ))}
          </ul>
        </section>
      )}

      {tab === "updates" && (
        <section className="adm-sec">
          <ul className="adm-notes">
            {UPDATES.map((u) => (
              <li key={u.id}><time>{u.date}</time><ul>{u.items.map((t, i) => <li key={i}>{t}</li>)}</ul></li>
            ))}
          </ul>
        </section>
      )}

      {tab === "guide" && <GuideTab />}

      {tab === "servers" && (
        <section className="adm-sec">
          <div className="adm-rows">
            <div className="adm-row srv head"><span>서버</span><span>인원</span><span>방장</span><span>왕복 평균</span><span>방장 fps</span><span>빌드</span></div>
            {RPG_SERVERS.map((s) => {
              const st = live(s) ? stats[s] : null;
              const r = rtt[s] || [];
              const avg = st && r.length ? Math.round(r.reduce((a, b) => a + b.ms, 0) / r.length) : null;
              const host = st && st.people.find((p) => p.id === st.host);
              return (
                <div className={`adm-row srv${srv === s ? " on" : ""}`} key={s} onClick={() => setSrv(s)}>
                  <span className="nm">{srvName(s)}</span>
                  <span>{st ? `${st.people.length}명` : "비어 있음"}</span>
                  <span>{host ? host.name : "—"}</span>
                  <span>{avg !== null ? `${avg}ms` : "—"}</span>
                  <span>{st ? st.fps : "—"}</span>
                  <span className="id">{st ? st.ver : "—"}</span>
                </div>
              );
            })}
          </div>
          <p className="adm-label">방장 화면이 {ADMIN.ping}초마다 답합니다. 왕복은 이 화면 → 방장 화면 → 이 화면 시간입니다.</p>
        </section>
      )}
    </div>
  );
}

// 왕복 시간 그래프 — 최근 ADMIN.keep 개 점. 1px 선 · 눈금 넷
function RttChart({ series, now }) {
  const W = typeof window !== "undefined" && window.innerWidth < 640 ? 420 : 1000, H = 180, PAD = { l: 44, r: 12, t: 12, b: 24 };
  const span = ADMIN.keep * ADMIN.ping * 1000;
  const top = Math.max(100, Math.ceil(Math.max(0, ...series.map((p) => p.ms)) / 100) * 100);
  const x = (t) => PAD.l + ((t - (now - span)) / span) * (W - PAD.l - PAD.r);
  const y = (ms) => PAD.t + (1 - ms / top) * (H - PAD.t - PAD.b);
  const pts = series.filter((p) => p.t >= now - span).map((p) => `${x(p.t).toFixed(1)},${y(p.ms).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(top * f));
  return (
    <svg className="adm-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="왕복 시간 그래프">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grid" />
          <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end">{v}</text>
        </g>
      ))}
      <text x={PAD.l} y={H - 6}>2분 전</text>
      <text x={W - PAD.r} y={H - 6} textAnchor="end">지금</text>
      {pts && <polyline points={pts} className="line" />}
      {series.length > 0 && series[series.length - 1].t >= now - span && (
        <circle cx={x(series[series.length - 1].t)} cy={y(series[series.length - 1].ms)} r="3.5" className="dot" />
      )}
    </svg>
  );
}

// 계정 탭 — 서버에 저장된 모든 캐릭터. 코드 · 입장권은 서버가 보내지 않는다
const ACC_PAGE = 20;                 // 한 쪽에 보이는 계정 수
const ACC_SORT = [
  ["saved", "최근 저장", (a, b) => Date.parse(b.saved) - Date.parse(a.saved)],
  ["lv", "레벨", (a, b) => b.lv - a.lv],
  ["coins", "코인", (a, b) => b.coins - a.coins],
  ["honor", "명예", (a, b) => b.honor - a.honor],
  ["made", "만든 날", (a, b) => Date.parse(b.made) - Date.parse(a.made)],
];
const day = (t) => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${clock(t).slice(0, 5)}`; };

function AccountsTab({ auth, onOut }) {
  const [editing, setEditing] = useState("");
  const [nextName, setNextName] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const changing = useRef(false);
  const renameAccount = async (e) => {
    e.preventDefault();
    if (changing.current) return;
    const next = nextName.trim().replace(/\s+/g, " ");
    if (!next || [...next].length > 8) { setErr("새 이름은 1~8글자로 적어 주세요."); return; }
    if (next === editing) { setErr("지금과 다른 이름을 적어 주세요."); return; }
    changing.current = true;
    setBusy(true); setErr(""); setNotice("");
    try {
      const r = await adminRename(auth.name, auth.code, editing, next);
      if (!r || !r.ok) {
        const messages = { taken: "이미 쓰는 이름입니다.", live: "접속 중인 계정입니다. 게임에서 나온 뒤 30초 후 다시 시도해 주세요.",
          name: "새 이름은 1~8글자로 적어 주세요.", missing: "계정을 찾을 수 없습니다. 새로 읽어 주세요.", same: "지금과 다른 이름을 적어 주세요." };
        setErr(messages[r?.err] || errOf(r)); return;
      }
      if (editing === auth.name) { onOut(); return; }
      setNotice(`${editing} → ${r.name} 변경 완료. 새 이름과 기존 코드로 다시 로그인해 주세요.`);
      setEditing(""); setNextName(""); setQ(""); setPage(0);
      await load();
    } finally { changing.current = false; setBusy(false); }
  };
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("saved");
  const [page, setPage] = useState(0);
  const load = useCallback(async () => {
    setErr("");
    const r = await adminAccounts(auth.name, auth.code);
    if (r && r.ok) setList(r.list);
    else setErr(errOf(r));
  }, [auth]);
  useEffect(() => { load(); }, [load]);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    const by = (ACC_SORT.find((x) => x[0] === sort) || ACC_SORT[0])[2];
    return (list || []).filter((a) => !k || a.name.toLowerCase().includes(k)).slice().sort(by);
  }, [list, q, sort]);
  const pages = Math.max(1, Math.ceil(shown.length / ACC_PAGE));
  const pg = Math.min(page, pages - 1);
  const live = (list || []).filter((a) => a.live).length;
  return (
    <section className="adm-sec">
      <p className="adm-count">전체 계정: <b>{list ? list.length : "—"}개</b><span>지금 접속 중 {live}명</span></p>
      <div className="adm-tools">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="이름 찾기" maxLength={8} />
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0); }}>
          {ACC_SORT.map(([id, label]) => <option key={id} value={id}>{label} 순</option>)}
        </select>
        <button onClick={load}>새로 읽기</button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {editing && <form className="adm-tools" onSubmit={renameAccount}>
        <label>{editing} → <input aria-label="새 계정 이름" autoFocus value={nextName} maxLength={8} disabled={busy} onChange={(e) => setNextName(e.target.value)} /></label>
        <button disabled={busy || !nextName.trim()} type="submit">{busy ? "변경 중…" : "이 이름으로 변경"}</button>
        <button disabled={busy} type="button" onClick={() => { setEditing(""); setErr(""); }}>취소</button>
        <p className="adm-label">게임에서 나온 계정만 변경할 수 있습니다. 변경 후 새 이름과 기존 코드로 로그인하세요. 관리자 본인의 이름을 바꾸면 관리 화면도 다시 로그인해야 합니다.</p>
      </form>}
      {err && <p className="adm-err" role="alert">{err}</p>}
      {!list && !err && <p className="adm-empty">불러오는 중…</p>}
      {list && (
        <div className="adm-rows">
          <div className="adm-row acc head"><span>이름</span><span>레벨</span><span>코인</span><span>명예</span><span>만든 날</span><span>마지막 저장</span><span>접속</span></div>
          {shown.slice(pg * ACC_PAGE, (pg + 1) * ACC_PAGE).map((a) => (
            <div className="adm-row acc" key={a.name}>
              <span className="nm">{a.name}<em>{a.admin ? "관리자" : (JOB_BY_ID[a.job] || {}).name || "직업 없음"}</em>
                <button className="adm-rename" disabled={busy || !!a.live} title={a.live ? "게임에서 나온 뒤 변경할 수 있습니다" : "계정 이름 변경"}
                  onClick={() => { setEditing(a.name); setNextName(a.name); setErr(""); setNotice(""); }}>이름 변경</button></span>
              <span>Lv {a.lv}</span>
              <span>{a.coins.toLocaleString("ko-KR")}</span>
              <span>{a.honor.toLocaleString("ko-KR")}</span>
              <span className="map">{day(a.made)}</span>
              <span className="map">{day(a.saved)}</span>
              <span>{a.live ? <i className="adm-tag host">{srvName(a.live)}</i> : <span className="map">—</span>}</span>
            </div>
          ))}
          {!shown.length && <p className="adm-empty">찾는 이름이 없습니다.</p>}
        </div>
      )}
      {pages > 1 && (
        <div className="adm-pager">
          <button disabled={pg <= 0} onClick={() => setPage(pg - 1)}>‹</button>
          <span>{pg + 1}/{pages}</span>
          <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>›</button>
        </div>
      )}
      <p className="adm-label">코드는 서버에 지문(해시)으로만 남아 보이지 않습니다. 접속은 지금 그 캐릭터가 들어가 있는 서버입니다.</p>
    </section>
  );
}


function TradesTab({ auth }) {
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setBusy(true);
    setResult(await adminTrades(auth.name, auth.code));
    setBusy(false);
  }, [auth]);
  useEffect(() => { load(); }, [load]);
  const states = { invite: "수락 대기", open: "진행 중", done: "완료", cancel: "취소", fail: "실패" };
  return <section className="adm-box">
    <div className="adm-tools"><h2>개인 거래 기록</h2><button disabled={busy} onClick={load}>{busy ? "불러오는 중…" : "새로 읽기"}</button></div>
    {result && !result.ok && <p role="alert">{errOf(result)}</p>}
    {result?.ok && !result.list.length && <p>거래 기록이 없습니다.</p>}
    {result?.list?.map((t) => <div className="adm-tools" key={t.id}>
      <span>{new Date(t.created_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</span>
      <b>{t.a} ↔ {t.b}</b><span>{t.server} · {states[t.state]}</span>
      {t.error && <span className="adm-err">{t.error}</span>}
      <button onClick={() => setSelected(selected?.id === t.id ? null : t)}>상세 보기</button>
    </div>)}
    {selected && <div><h3>등록 내용과 확인 상태</h3><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify({ id: selected.id, offers: selected.offers, accepted: selected.accepted, error: selected.error }, null, 2)}</pre></div>}
  </section>;
}

// 문의 탭 — 게임 안에서 보낸 문의 · 의견(최근 300개). RPG 문의는 글 앞에 "[RPG 문의]"가 붙어 온다(InquiryPanel.jsx)
const INQ_PAGE = 20;                 // 한 쪽에 보이는 글 수
const INQ_TAG = "[RPG 문의]";
const INQ_KIND = [["all", "전체"], ["rpg", "RPG 문의"], ["def", "방어전 의견"]];
const INQ_RESULT = { lobby: "대기실", play: "플레이 중", clear: "클리어", over: "패배", wipe: "전멸" };

function InquiryTab({ auth }) {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const load = useCallback(async () => {
    setBusy(true); setErr("");
    const r = await adminFeedback(auth.name, auth.code);
    if (r && r.ok) setList(r.list);
    // 함수를 아직 설치하지 않은 서버는 net 오류로 온다 — supabase/feedback.sql 의 끝부분
    else setErr(r && r.err === "net" ? "문의를 읽지 못했습니다. 연결이 끊겼거나 서버에 문의 읽기 함수(supabase/feedback.sql)가 아직 없습니다" : errOf(r));
    setBusy(false);
  }, [auth]);
  useEffect(() => { load(); }, [load]);
  const rows = useMemo(() => (list || []).map((f) => {
    const rpg = f.body.startsWith(INQ_TAG);
    return { ...f, rpg, text: rpg ? f.body.slice(INQ_TAG.length).trim() : f.body };
  }), [list]);
  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return rows.filter((f) => (kind === "all" || (kind === "rpg") === f.rpg)
      && (!k || f.text.toLowerCase().includes(k) || (f.name || "").toLowerCase().includes(k)));
  }, [rows, kind, q]);
  const pages = Math.max(1, Math.ceil(shown.length / INQ_PAGE));
  const pg = Math.min(page, pages - 1);
  return (
    <section className="adm-sec">
      <p className="adm-count">받은 문의: <b>{list ? list.length : "—"}개</b><span>최근 300개까지 최근 순으로 보입니다</span></p>
      <div className="adm-tools">
        <select value={kind} onChange={(e) => { setKind(e.target.value); setPage(0); }} aria-label="종류">
          {INQ_KIND.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="글 · 이름 찾기" maxLength={20} />
        <button onClick={load} disabled={busy}>{busy ? "읽는 중…" : "새로 읽기"}</button>
      </div>
      {err && <p className="adm-err" role="alert">{err}</p>}
      {!list && !err && <p className="adm-empty">불러오는 중…</p>}
      {list && !shown.length && <p className="adm-empty">{list.length ? "찾는 글이 없습니다." : "받은 문의가 없습니다."}</p>}
      {list && shown.length > 0 && (
        <ul className="adm-inq">
          {shown.slice(pg * INQ_PAGE, (pg + 1) * INQ_PAGE).map((f) => (
            <li key={f.id}>
              <div className="meta">
                <i className={`adm-tag${f.rpg ? " host" : ""}`}>{f.rpg ? "RPG 문의" : "방어전 의견"}</i>
                <b>{f.name || "이름 없음"}</b>
                {f.cls && <em>{(JOB_BY_ID[f.cls] || {}).name || f.cls}</em>}
                {f.room && <em>{f.rpg ? srvName(f.room) : `방 ${f.room}`}</em>}
                {!f.rpg && <em>{INQ_RESULT[f.result] || f.result}{f.wave ? ` · ${f.wave}${f.total ? `/${f.total}` : ""}웨이브` : ""}{f.diff ? ` · ${f.diff}` : ""}</em>}
                <time>{day(f.at)}</time>
              </div>
              <p>{f.text}</p>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="adm-pager">
          <button disabled={pg <= 0} onClick={() => setPage(pg - 1)}>‹</button>
          <span>{pg + 1}/{pages}</span>
          <button disabled={pg >= pages - 1} onClick={() => setPage(pg + 1)}>›</button>
        </div>
      )}
      <p className="adm-label">글은 읽기만 됩니다. 이름 · 서버 · 직업은 보낼 때 함께 온 값입니다.</p>
    </section>
  );
}

/* 코드 가이드 — 바꾸고 싶은 숫자가 어느 파일 · 어느 이름에 있는지(codeGuideData.js). 지금 값은 코드에서 직접 읽는다 */
function GuideTab() {
  const [q, setQ] = useState("");
  const [grp, setGrp] = useState(-1);
  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return GUIDE.filter((e) => (grp < 0 || e.g === grp) && (!k || `${e.title} ${e.file} ${e.name} ${e.effect} ${e.ex}`.toLowerCase().includes(k)));
  }, [q, grp]);
  return (
    <section className="adm-sec">
      <p className="adm-label">코드 수정 가이드 — 숫자 하나를 바꾸면 무엇이 달라지는지 모았습니다.</p>
      <ol className="adm-how">{GUIDE_HOW.map((t, i) => <li key={i}>{t.replace(/^\d+\.\s*/, "")}</li>)}</ol>
      <div className="adm-guide-bar">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="검색 — 치명타 · 속도 · 체력 · 경험치" />
        <div className="adm-srvs adm-guide-grp">
          <button className={grp < 0 ? "on" : ""} onClick={() => setGrp(-1)}>전체</button>
          {GUIDE_GROUPS.map((n, i) => <button key={n} className={grp === i ? "on" : ""} onClick={() => setGrp(i)}>{n}</button>)}
        </div>
      </div>
      {!list.length && <p className="adm-empty">찾는 항목이 없습니다.</p>}
      <div className="adm-guide">
        {list.map((e) => {
          let now = "";
          try { now = String(e.now()); } catch { now = "읽지 못했습니다"; }
          return (
            <article key={e.title} className="adm-gcard">
              <h3>{e.title}<span>{GUIDE_GROUPS[e.g]}</span></h3>
              <dl>
                <dt>파일</dt><dd><code>{e.file}</code></dd>
                <dt>이름</dt><dd><code>{e.name}</code></dd>
                <dt>지금 값</dt><dd><b>{now}</b></dd>
                <dt>바꾸면</dt><dd>{e.effect}</dd>
                {e.ex && <><dt>예시</dt><dd>{e.ex}</dd></>}
              </dl>
              {(SNIPS[e.title] || []).map((b) => (
                <figure key={b.file + b.from} className="adm-code">
                  <figcaption>{b.file} · {b.from}행</figcaption>
                  <pre>{b.code.map((l, i) => <span key={i}><i>{b.from + i}</i>{l}{"\n"}</span>)}</pre>
                </figure>
              ))}
            </article>
          );
        })}
      </div>
    </section>
  );
}
