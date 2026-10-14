/* ── RPG 캐릭터 만들기의 01 칸 — 이름과 숫자 5자리 코드 ─────────────────
   새로 만들기: 이름 → 서버에서 쓸 수 있는지 확인 → 코드 두 번 → "꼭 적어 두세요" → 서버에 만든다.
   이어 하기: 이름 + 코드 → 서버 기록을 이 기기로 불러온다.
   캐릭터가 서버에 있으면 새 캐릭터를 더 만들 수 있다. 지금 캐릭터는 서버에 남고 이 기기는 새 캐릭터로 바뀐다.
   이 기기에 예전 캐릭터(서버에 없는 것)가 있으면 코드를 정해 서버로 옮긴다. 이름이 겹치면 이때만 이름을 바꿀 수 있다.
   다른 기기가 나중에 들어와 입장권이 무효가 되었으면 코드를 다시 넣어 서버 기록을 불러온다.
   onChar(c) 는 바뀐 캐릭터(loadChar 결과)를 알린다. */
import { useState } from "react";
import { NAME_MAX, cleanName, makeChar, adoptChar, setAccount, charRecord, loadChar } from "./game/rpg.js";
import { CODE_LEN, codeProblem, onlyDigits, errText, nameFree, createAccount, login } from "./net/rpgSave.js";

function CodeInput({ value, onChange, label, onEnter, autoFocus }) {
  return (
    <input
      className="mk-input mk-code" value={value} inputMode="numeric" autoComplete="off" maxLength={CODE_LEN}
      placeholder={"0".repeat(CODE_LEN).replace(/0/g, "·")} aria-label={label} autoFocus={autoFocus}
      onChange={(e) => onChange(onlyDigits(e.target.value))}
      onKeyDown={(e) => { if (e.key === "Enter" && onEnter) onEnter(); }}
    />
  );
}

// 코드를 두 번 받고 확인까지 — 새로 만들기와 예전 캐릭터 옮기기가 같이 쓴다
function CodeSetter({ name, busy, err, onBack, onDone, setErr }) {
  const [c1, setC1] = useState("");
  const [c2, setC2] = useState("");
  const [sure, setSure] = useState(false);
  const next = () => {
    const bad = codeProblem(c1);
    if (bad) return setErr(bad);
    if (c1 !== c2) return setErr("두 코드가 다릅니다. 같은 코드를 두 번 넣어 주세요.");
    setErr("");
    setSure(true);
  };
  if (sure) {
    return (
      <div className="mk-confirm">
        <p className="mk-code-show"><span>이름</span><b>{name}</b><span>코드</span><b>{c1}</b></p>
        <p className="mk-warn">꼭 적어 두세요. 다른 기기에서는 이 이름과 코드로 이어 합니다. 코드를 잊으면 되찾을 수 없고, 정한 뒤에는 바꿀 수 없습니다.</p>
        <div className="mk-row">
          <button className="btn-main" disabled={busy} onClick={() => onDone(c1)}>{busy ? "만드는 중…" : "이 이름과 코드로 정하기"}</button>
          <button className="btn-ghost" disabled={busy} onClick={() => { setSure(false); setErr(""); }}>코드 다시 쓰기</button>
        </div>
        {err && <p className="err">{err}</p>}
      </div>
    );
  }
  return (
    <div>
      <p className="mk-note">
        <b>{name}</b>의 코드를 정합니다. 숫자 {CODE_LEN}자리입니다. 같은 숫자 반복(00000)과 연속 숫자(12345)는 쓸 수 없습니다.
      </p>
      <div className="mk-row">
        <CodeInput value={c1} onChange={(v) => { setC1(v); setErr(""); }} label="코드" autoFocus />
        <CodeInput value={c2} onChange={(v) => { setC2(v); setErr(""); }} label="코드 한 번 더" onEnter={next} />
        <button className="btn-ghost tall" onClick={next}>다음</button>
        {onBack && <button className="btn-ghost tall" onClick={onBack}>이름 다시 쓰기</button>}
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}

// 이름 + 코드로 불러오기
function LoginForm({ fixedName, busy, err, setErr, onLogin, onCancel, cancelText }) {
  const [name, setName] = useState(fixedName || "");
  const [code, setCode] = useState("");
  const go = () => {
    const n = cleanName(fixedName || name);
    if (!n) return setErr("이름을 적어 주세요.");
    if (code.length !== CODE_LEN) return setErr(`코드 ${CODE_LEN}자리를 넣어 주세요.`);
    onLogin(n, code);
  };
  return (
    <div>
      <div className="mk-row">
        {!fixedName && (
          <input className="mk-input" value={name} maxLength={NAME_MAX} placeholder="이름" aria-label="이름"
            onChange={(e) => { setName(e.target.value); setErr(""); }} />
        )}
        <CodeInput value={code} onChange={(v) => { setCode(v); setErr(""); }} label="코드" onEnter={go} autoFocus={!!fixedName} />
        <button className="btn-main" disabled={busy} onClick={go}>{busy ? "불러오는 중…" : "이어 하기"}</button>
        {onCancel && <button className="btn-ghost tall" disabled={busy} onClick={onCancel}>{cancelText}</button>}
      </div>
      {err && <p className="err">{err}</p>}
    </div>
  );
}

export default function RpgAccount({ char, onChar }) {
  const [mode, setMode] = useState("new");          // new 새로 만들기 · login 이어 하기 · switch 다른 캐릭터 불러오기 · add 캐릭터 하나 더 만들기
  const [draft, setDraft] = useState("");
  const [picked, setPicked] = useState("");         // 쓸 수 있다고 확인한 이름 — 정해지면 코드 단계로
  const [rename, setRename] = useState("");         // 예전 캐릭터 이름이 서버에서 겹칠 때 새 이름
  const [needRename, setNeedRename] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  // 이름을 정하기 전에 서버에서 쓸 수 있는지 본다
  const checkName = (raw, then) => run(async () => {
    const n = cleanName(raw);
    if (!n) return setErr("이름을 한 글자 이상 적어 주세요.");
    const r = await nameFree(n);
    if (!r.ok) return setErr(errText(r));
    if (!r.free) return setErr("이미 쓰는 이름입니다. 다른 이름을 정해 주세요.");
    setErr("");
    then(n);
  });
  // 새 캐릭터를 서버에 만든다
  const create = (code) => run(async () => {
    const r = await createAccount(picked, code, { v: 3, name: picked, lv: 1, xp: 0, coins: 0, quest: { on: false, n: 0 } });
    if (!r.ok) {
      if (r.err === "taken") { setPicked(""); }
      return setErr(errText(r));
    }
    // 캐릭터를 하나 더 만들 때는 이 기기의 지금 캐릭터를 새 캐릭터로 바꾼다(지금 캐릭터는 서버에 남아 있다)
    const c = char ? adoptChar(r.name, { lv: 1, xp: 0, coins: 0, quest: { on: false, n: 0 } }, r.token, false)
      : makeChar(r.name, { tok: r.token });
    if (!c) return setErr("이 기기에 저장하지 못했습니다. 다시 시도해 주세요.");
    setErr("");
    setPicked(""); setDraft(""); setMode("new");
    onChar(c);
  });
  // 예전 캐릭터를 서버로 옮긴다 — 이름이 겹치면 새 이름으로
  const migrate = (code) => run(async () => {
    const name = needRename ? cleanName(rename) : char.name;
    const data = { ...charRecord(), name };
    const r = await createAccount(name, code, data);
    if (!r.ok) {
      if (r.err === "taken") setNeedRename(true);
      return setErr(errText(r));
    }
    if (!setAccount({ name: r.name, linked: 1, tok: r.token })) return setErr("이 기기에 저장하지 못했습니다. 다시 시도해 주세요.");
    setErr("");
    setNeedRename(false);
    onChar(loadChar());
  });
  // 이름 + 코드로 서버 기록을 불러온다
  const doLogin = (name, code) => run(async () => {
    const r = await login(name, code);
    if (!r.ok) return setErr(errText(r));
    const c = adoptChar(r.name, r.data, r.token, r.admin);
    if (!c) return setErr("이 기기에 저장하지 못했습니다. 다시 시도해 주세요.");
    setErr("");
    setMode("new");
    onChar(c);
  });

  // 새 이름 정하기 → 코드 정하기. onCancel 이 있으면 그만두는 단추를 단다
  const newCharSteps = (onCancel) => {
    if (picked) {
      return (
        <CodeSetter name={picked} busy={busy} err={err} setErr={setErr} onDone={create}
          onBack={() => { setPicked(""); setErr(""); }} />
      );
    }
    return (
      <>
        <div className="mk-row">
          <input
            className="mk-input" value={draft} maxLength={NAME_MAX} placeholder={`${NAME_MAX}글자까지`} autoFocus={!!onCancel}
            onChange={(e) => { setDraft(e.target.value); setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") checkName(draft, setPicked); }}
          />
          <button className="btn-ghost tall" disabled={busy} onClick={() => checkName(draft, setPicked)}>{busy ? "확인 중…" : "이름 정하기"}</button>
          {onCancel && <button className="btn-ghost tall" disabled={busy} onClick={onCancel}>취소</button>}
        </div>
        <p className="mk-warn">이름은 변경 불가합니다. 다음 단계에서 숫자 {CODE_LEN}자리 코드를 정하면 서버에 저장되어 다른 기기에서도 이어 할 수 있습니다.</p>
        {err && <p className="err">{err}</p>}
      </>
    );
  };

  /* 캐릭터가 이미 있을 때 */
  if (char) {
    const head = (
      <div className="mk-name-fixed">
        <b>{char.name}</b>
        <span className="mk-lock">변경 불가</span>
      </div>
    );
    if (mode === "switch") {
      return (
        <div>
          {head}
          <p className="mk-note">다른 캐릭터의 이름과 코드를 넣으면 그 캐릭터로 바뀝니다. 지금 캐릭터는 서버에 남아 있어 나중에 다시 불러올 수 있습니다.</p>
          <LoginForm busy={busy} err={err} setErr={setErr} onLogin={doLogin}
            onCancel={() => { setMode("new"); setErr(""); }} cancelText="취소" />
        </div>
      );
    }
    if (mode === "add") {
      return (
        <div>
          <p className="mk-note">새 캐릭터를 만듭니다. 지금 캐릭터 <b>{char.name}</b>는 서버에 남아 있어 나중에 이름과 코드로 다시 불러올 수 있습니다.</p>
          {newCharSteps(() => { setMode("new"); setPicked(""); setDraft(""); setErr(""); })}
        </div>
      );
    }
    if (char.linked && char.tok) {
      return (
        <div>
          {head}
          <p className="mk-note">서버에 저장됩니다. 다른 기기에서는 이름과 코드로 이어 할 수 있습니다.</p>
          <div className="mk-row">
            <button className="btn-ghost" onClick={() => { setMode("switch"); setErr(""); }}>다른 캐릭터로 이어 하기</button>
            <button className="btn-ghost" onClick={() => { setMode("add"); setPicked(""); setDraft(""); setErr(""); }}>새 캐릭터 만들기</button>
          </div>
        </div>
      );
    }
    if (char.linked) {
      return (
        <div>
          {head}
          <p className="mk-warn">다른 기기에서 이 캐릭터로 들어와 이 기기의 서버 저장이 멈췄습니다. 이어 하려면 코드를 넣어 주세요. 서버에 저장된 기록을 불러옵니다.</p>
          <LoginForm fixedName={char.name} busy={busy} err={err} setErr={setErr} onLogin={doLogin} />
        </div>
      );
    }
    // 예전 캐릭터 — 아직 서버에 없다
    return (
      <div>
        {head}
        <div className="mk-confirm">
          <p><b>코드를 정해 주세요.</b> 정하면 이 캐릭터가 서버에 저장되고, 다른 기기에서도 이름과 코드로 이어 할 수 있습니다.</p>
          {needRename && (
            <div className="mk-row">
              <input className="mk-input" value={rename} maxLength={NAME_MAX} placeholder="새 이름" aria-label="새 이름"
                onChange={(e) => { setRename(e.target.value); setErr(""); }} />
              <span className="mk-note">이 이름은 이미 서버에서 다른 사람이 씁니다. 이번 한 번만 이름을 바꿀 수 있습니다.</span>
            </div>
          )}
          <CodeSetter name={needRename ? cleanName(rename) || "새 이름" : char.name} busy={busy} err={err} setErr={setErr}
            onDone={(code) => {
              if (needRename && !cleanName(rename)) return setErr("새 이름을 적어 주세요.");
              migrate(code);
            }} />
          <p className="mk-note">나중에 정해도 됩니다. 그동안은 이 기기에만 저장됩니다.</p>
        </div>
      </div>
    );
  }

  /* 캐릭터가 없을 때 — 새로 만들기 · 이어 하기 */
  if (mode === "login") {
    return (
      <div>
        <p className="mk-note">다른 기기에서 만든 캐릭터를 이름과 코드로 불러옵니다.</p>
        <LoginForm busy={busy} err={err} setErr={setErr} onLogin={doLogin}
          onCancel={() => { setMode("new"); setErr(""); }} cancelText="새로 만들기" />
      </div>
    );
  }
  if (picked) return newCharSteps();
  return (
    <div>
      {newCharSteps()}
      <button className="btn-ghost mk-switch" onClick={() => { setMode("login"); setErr(""); }}>이미 캐릭터가 있나요? 코드로 이어 하기</button>
    </div>
  );
}
