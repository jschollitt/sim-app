import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, CheckSquare, BookOpen, Activity, CalendarDays, Plus,
  Droplet, Dumbbell, Utensils, Check, ChevronLeft, ChevronRight, ChevronDown,
  Trash2, Flame, ListChecks, Sparkles, Cloud, Sun, CloudSun, CloudRain,
  CloudSnow, CloudLightning, CloudFog, Scale, Moon, History, User
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ---------- helpers ----------
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const niceDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};
const greetingWord = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
};
const MOODS = [
  { v: 1, label: "Rough", color: "#9C8B92" },
  { v: 2, label: "Low", color: "#C0A6B7" },
  { v: 3, label: "Okay", color: "#E2A6BB" },
  { v: 4, label: "Good", color: "#EC7FA0" },
  { v: 5, label: "Great", color: "#D14D7C" },
];
const HABIT_COLORS = ["#D14D7C", "#8FA88F", "#C79A5C", "#7C93BF", "#B892C9"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
// Auckland Airport, NZ coordinates — used for live weather.
const WEATHER_LAT = -37.0082;
const WEATHER_LON = 174.7850;
const weatherCodeInfo = (code) => {
  if (code === 0) return { label: "Clear sky", Icon: Sun };
  if (code === 1 || code === 2) return { label: "Partly cloudy", Icon: CloudSun };
  if (code === 3) return { label: "Overcast", Icon: Cloud };
  if (code === 45 || code === 48) return { label: "Foggy", Icon: CloudFog };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rainy", Icon: CloudRain };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snowy", Icon: CloudSnow };
  if ([95, 96, 99].includes(code)) return { label: "Stormy", Icon: CloudLightning };
  return { label: "Cloudy", Icon: Cloud };
};
const LIBRA_HOROSCOPES = [
  "Balance is the theme today — weigh your options, then commit without second-guessing.",
  "A conversation you've been putting off will go more smoothly than you expect. Reach out.",
  "Your knack for fairness is needed somewhere today. Someone will look to you to mediate.",
  "Slow down before agreeing to anything new — read the fine print, literally or otherwise.",
  "Beauty and order help you think. Tidy your space before tackling the big decision.",
  "A partnership, old or new, benefits from a little more honesty than usual today.",
  "You'll want to please everyone — pick one thing you actually want instead.",
  "Diplomacy gets you far, but today a direct answer serves you better than a smooth one.",
  "Something aesthetic catches your eye and leads to an unexpectedly good idea.",
  "The scales tip in your favor if you ask for what you need instead of hinting at it.",
  "A long-standing tension eases once you stop trying to be neutral about it.",
  "Good company lifts your mood more than any plan you could make alone.",
];
const dailyHoroscope = () => {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const diff = new Date() - start;
  const dayOfYear = Math.floor(diff / 86400000);
  return LIBRA_HOROSCOPES[dayOfYear % LIBRA_HOROSCOPES.length];
};
const getMoonPhase = (date = new Date()) => {
  const synodic = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const diffDays = (date.getTime() - knownNewMoon) / 86400000;
  let phase = (diffDays % synodic) / synodic;
  if (phase < 0) phase += 1;
  const index = Math.floor(phase * 8 + 0.5) % 8;
  const names = ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"];
  return { name: names[index] };
};

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    if (res && res.value) return JSON.parse(res.value);
    return fallback;
  } catch (e) {
    return fallback;
  }
}
async function saveKey(key, data) {
  try {
    await window.storage.set(key, JSON.stringify(data), false);
  } catch (e) {
    console.error("save failed", key, e);
  }
}

const BLANK_HABITS = { habits: [], logs: {} };
const BLANK_JOURNAL = { entries: [], currentBook: "" };
const BLANK_FITNESS = { water: {}, exercise: [], meals: [], weights: [] };
const BLANK_PLANNER = { todos: [], goals: [], events: [], todoHistory: [] };
const BLANK_PROFILE = { name: "", age: "", heightCm: "", weightKg: "", activityLevel: "", goal: "", waterGoal: 6, auraColor: "blush" };

export default function LifestyleApp() {
  const [tab, setTab] = useState("today");
  const [ready, setReady] = useState(false);

  const [habitsData, setHabitsData] = useState(BLANK_HABITS);
  const [journalData, setJournalData] = useState(BLANK_JOURNAL);
  const [fitnessData, setFitnessData] = useState(BLANK_FITNESS);
  const [plannerData, setPlannerData] = useState(BLANK_PLANNER);
  const [profileData, setProfileData] = useState(BLANK_PROFILE);

  useEffect(() => {
    (async () => {
      const [h, j, f, p, pr] = await Promise.all([
        loadKey("habits-data", BLANK_HABITS),
        loadKey("journal-data", BLANK_JOURNAL),
        loadKey("fitness-data", BLANK_FITNESS),
        loadKey("planner-data", BLANK_PLANNER),
        loadKey("profile-data", BLANK_PROFILE),
      ]);
      setHabitsData(h);
      setJournalData({ ...BLANK_JOURNAL, ...j });
      setFitnessData({ ...BLANK_FITNESS, ...f });
      setPlannerData({ ...BLANK_PLANNER, ...p });
      setProfileData({ ...BLANK_PROFILE, ...pr });
      setReady(true);
    })();
  }, []);

  const updateHabits = useCallback((next) => { setHabitsData(next); saveKey("habits-data", next); }, []);
  const updateJournal = useCallback((next) => { setJournalData(next); saveKey("journal-data", next); }, []);
  const updateFitness = useCallback((next) => { setFitnessData(next); saveKey("fitness-data", next); }, []);
  const updatePlanner = useCallback((next) => { setPlannerData(next); saveKey("planner-data", next); }, []);
  const updateProfile = useCallback((next) => { setProfileData(next); saveKey("profile-data", next); }, []);

  const resetAllData = useCallback(async () => {
    const keys = ["habits-data", "journal-data", "fitness-data", "planner-data", "profile-data"];
    for (const k of keys) {
      try { await window.storage.delete(k, false); } catch (e) { /* key may not exist yet */ }
    }
    setHabitsData(BLANK_HABITS);
    setJournalData(BLANK_JOURNAL);
    setFitnessData(BLANK_FITNESS);
    setPlannerData(BLANK_PLANNER);
    setProfileData(BLANK_PROFILE);
    setTab("today");
  }, []);

  const exportData = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: profileData,
      habits: habitsData,
      journal: journalData,
      fitness: fitnessData,
      planner: plannerData,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifestyle-app-data-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [profileData, habitsData, journalData, fitnessData, plannerData]);

  const today = todayStr();

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#FBE6E9,#F3D9E6)", color: "#9C8890", fontFamily: "system-ui, sans-serif" }}>
        Opening your day…
      </div>
    );
  }

  return (
    <div className="lf-app">
      <style>{`
        .lf-app {
          --bg1: #FCE7EA; --bg2: #F5DCE9; --bg3: #EFE4F3;
          --card: rgba(255,255,255,0.86);
          --card-solid: #FFFFFF;
          --tint-pink: #FCEEF1; --tint-blue: #EAF1FB; --tint-green: #EBF6EF; --tint-lav: #F1ECFA;
          --ink: #2B2225; --muted: #9C8890; --line: rgba(43,34,37,0.07);
          --rose: #D14D7C; --rose-deep: #B93C68; --rose-soft: #E9A9BE;
          --nav-bg: #241C1F; --nav-icon: #EFE6E3;
          --serif: Georgia, 'Times New Roman', serif;
          --sans: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', system-ui, sans-serif;
          background: linear-gradient(160deg, var(--bg1) 0%, var(--bg2) 55%, var(--bg3) 100%);
          color: var(--ink);
          font-family: var(--sans);
          min-height: 100vh;
          max-width: 460px;
          margin: 0 auto;
          position: relative;
          padding-bottom: 100px;
          box-sizing: border-box;
        }
        .lf-app * { box-sizing: border-box; }
        .lf-main { padding: 22px 18px 10px; display: flex; flex-direction: column; gap: 20px; }
        .lf-label {
          text-transform: uppercase;
          letter-spacing: 1.8px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--muted);
        }
        .lf-card {
          background: var(--card);
          backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.6);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 10px 26px rgba(180,110,135,0.13);
        }
        .lf-row { display: flex; align-items: center; gap: 10px; }
        .lf-btn {
          background: linear-gradient(135deg, var(--rose), var(--rose-deep));
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 11px 16px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          box-shadow: 0 6px 16px rgba(209,77,124,0.35);
        }
        .lf-btn:active { opacity: 0.9; }
        .lf-btn-ghost {
          background: #fff;
          color: var(--ink);
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 11px 16px;
          font-size: 13.5px;
          cursor: pointer;
        }
        .lf-input {
          background: #fff;
          border: 1px solid var(--line);
          border-radius: 14px;
          padding: 11px 14px;
          color: var(--ink);
          font-size: 14px;
          font-family: var(--sans);
          width: 100%;
        }
        .lf-input::placeholder { color: var(--muted); }
        .lf-icon-btn {
          background: transparent;
          border: none;
          color: var(--muted);
          cursor: pointer;
          padding: 6px;
          display: flex;
          align-items: center;
        }
        .lf-icon-btn:hover { color: var(--ink); }
        .lf-nav {
          position: fixed;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--nav-bg);
          border-radius: 999px;
          display: flex;
          gap: 4px;
          padding: 10px 10px;
          box-shadow: 0 14px 30px rgba(0,0,0,0.28);
          z-index: 10;
        }
        .lf-nav button {
          background: none;
          border: none;
          color: #9C9296;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          width: 42px;
          height: 42px;
          border-radius: 999px;
        }
        .lf-nav button.active { color: var(--nav-bg); background: var(--nav-icon); }
        .lf-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 14px;
          border-radius: 999px;
          border: 1px solid var(--line);
          font-size: 13px;
          cursor: pointer;
          background: #fff;
        }
        .lf-divider { height: 1px; background: var(--line); border: none; margin: 4px 0; }
        .lf-empty { color: var(--muted); font-size: 13px; padding: 10px 2px; }
        .lf-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .lf-glossy {
          border-radius: 50%;
          position: relative;
          box-shadow: inset 0 -6px 10px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.1);
        }
        .lf-glossy::after {
          content: "";
          position: absolute;
          top: 14%; left: 22%;
          width: 30%; height: 22%;
          background: rgba(255,255,255,0.75);
          border-radius: 50%;
          filter: blur(1px);
        }
        .lf-orb-wrap { position: relative; width: 100%; height: 150px; margin-bottom: 2px; }
        .lf-orb {
          position: absolute; top: 50%; left: 50%; width: 150px; height: 150px; margin: -75px 0 0 -75px;
          border-radius: 50%; filter: blur(20px); opacity: 0.55;
          background: radial-gradient(circle at 35% 35%, #F3B8D0, #C9A9E8 55%, transparent 75%);
          animation: lf-orb-drift 18s ease-in-out infinite;
        }
        .lf-orb-shine {
          position: absolute; top: 50%; left: 50%; width: 50px; height: 50px; margin: -25px 0 0 -25px;
          border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.85), transparent 70%);
          filter: blur(6px); animation: lf-shine-drift 9s ease-in-out infinite;
        }
        @keyframes lf-orb-drift {
          0%   { transform: translate(-10px, 4px) rotate(0deg) scale(1); }
          25%  { transform: translate(8px, -10px) rotate(20deg) scale(1.05); }
          50%  { transform: translate(12px, 8px) rotate(35deg) scale(0.96); }
          75%  { transform: translate(-8px, 10px) rotate(15deg) scale(1.03); }
          100% { transform: translate(-10px, 4px) rotate(0deg) scale(1); }
        }
        @keyframes lf-shine-drift {
          0%   { transform: translate(-14px,-8px) scale(1); opacity: 0.7; }
          50%  { transform: translate(16px, 12px) scale(1.2); opacity: 0.95; }
          100% { transform: translate(-14px,-8px) scale(1); opacity: 0.7; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lf-orb, .lf-orb-shine { animation: none; }
        }
      `}</style>

      <div className="lf-main">
        {tab === "today" && (
          <TodayTab
            today={today}
            habitsData={habitsData} updateHabits={updateHabits}
            journalData={journalData} updateJournal={updateJournal}
            fitnessData={fitnessData} updateFitness={updateFitness}
            plannerData={plannerData} updatePlanner={updatePlanner}
            profileData={profileData}
            exportData={exportData}
            resetAllData={resetAllData}
            setTab={setTab}
          />
        )}
        {tab === "habits" && <HabitsTab today={today} data={habitsData} update={updateHabits} plannerData={plannerData} updatePlanner={updatePlanner} />}
        {tab === "journal" && <JournalTab today={today} data={journalData} update={updateJournal} />}
        {tab === "fitness" && <FitnessTab today={today} data={fitnessData} update={updateFitness} waterGoal={profileData.waterGoal} />}
        {tab === "planner" && <PlannerTab today={today} data={plannerData} update={updatePlanner} />}
        {tab === "history" && <HistoryTab today={today} habitsData={habitsData} fitnessData={fitnessData} />}
        {tab === "profile" && <ProfileTab data={profileData} update={updateProfile} setTab={setTab} />}
      </div>

      <nav className="lf-nav">
        <NavBtn icon={Home} active={tab === "today"} onClick={() => setTab("today")} />
        <NavBtn icon={CheckSquare} active={tab === "habits"} onClick={() => setTab("habits")} />
        <NavBtn icon={BookOpen} active={tab === "journal"} onClick={() => setTab("journal")} />
        <NavBtn icon={Activity} active={tab === "fitness"} onClick={() => setTab("fitness")} />
        <NavBtn icon={CalendarDays} active={tab === "planner"} onClick={() => setTab("planner")} />
        <NavBtn icon={History} active={tab === "history"} onClick={() => setTab("history")} />
      </nav>
    </div>
  );
}

function NavBtn({ icon: Icon, active, onClick }) {
  return (
    <button className={active ? "active" : ""} onClick={onClick}>
      <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
    </button>
  );
}

const AURA_PALETTE = [
  { key: "blush", label: "Blush", c1: "#F3B8D0", c2: "#C9A9E8" },
  { key: "sage", label: "Sage", c1: "#CDE8D3", c2: "#8FB99C" },
  { key: "gold", label: "Gold", c1: "#F5D9A8", c2: "#D9A15C" },
  { key: "sky", label: "Sky", c1: "#BFDDF5", c2: "#87A9D9" },
  { key: "lilac", label: "Lilac", c1: "#E3C9F0", c2: "#A87CC2" },
];

// Aura-glow logo mark used for the profile page header. No shape, just a soft
// glow with the person's initial blended softly into it.
function ProfileMark({ name, auraKey = "blush", size = 60 }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  const palette = AURA_PALETTE.find((p) => p.key === auraKey) || AURA_PALETTE[0];
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", inset: -size * 0.25, borderRadius: "50%",
        background: `radial-gradient(circle, ${palette.c1}, ${palette.c2} 55%, transparent 75%)`,
        filter: `blur(${Math.max(8, size * 0.3)}px)`, opacity: 0.9,
      }} />
      <span style={{ position: "relative", color: palette.c2, opacity: 0.55, fontWeight: 500, fontFamily: "var(--serif)", fontSize: size * 0.36 }}>{initial}</span>
    </div>
  );
}

function Collapsible({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="lf-row" style={{ justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <span className="lf-label">{title}</span>
        <ChevronDown size={15} color="var(--muted)" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
      </div>
      {open && <div style={{ marginTop: 10 }}>{children}</div>}
    </div>
  );
}

// Reusable month calendar for log history. getDayItems(ds) returns an array of
// strings to show for that date; presence of items also drives cell intensity
// unless getIntensity is provided.
function LogCalendar({ color, getDayItems, getIntensity, today, emptyLabel = "Nothing logged." }) {
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selected, setSelected] = useState(today);

  const grid = useMemo(() => {
    const first = new Date(calMonth.y, calMonth.m, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calMonth]);
  const monthLabel = new Date(calMonth.y, calMonth.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const selectedItems = getDayItems(selected);

  return (
    <div className="lf-card">
      <div className="lf-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <button className="lf-icon-btn" onClick={() => setCalMonth((c) => { const m = c.m - 1; return m < 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m }; })}><ChevronLeft size={16} /></button>
        <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16 }}>{monthLabel}</span>
        <button className="lf-icon-btn" onClick={() => setCalMonth((c) => { const m = c.m + 1; return m > 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m }; })}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, color: "var(--muted)" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
        {grid.map((d, i) => {
          if (!d) return <div key={i} />;
          const ds = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const items = getDayItems(ds);
          const intensity = getIntensity ? getIntensity(ds) : (items.length > 0 ? 1 : 0);
          const isSelected = ds === selected;
          const isToday = ds === today;
          return (
            <div key={i} onClick={() => setSelected(ds)}
              style={{
                textAlign: "center", padding: "6px 0", borderRadius: 9, cursor: "pointer", fontSize: 11.5,
                background: intensity > 0 ? color : "var(--tint-lav)",
                opacity: intensity > 0 ? Math.max(0.32, intensity) : 1,
                color: intensity > 0.5 ? "#fff" : "var(--ink)",
                outline: isSelected ? "2px solid var(--rose-deep)" : isToday ? "1.5px solid var(--rose-soft)" : "none",
                outlineOffset: -1.5,
              }}>
              {d}
            </div>
          );
        })}
      </div>
      <hr className="lf-divider" style={{ margin: "14px 0" }} />
      <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{selected === today ? "Today" : niceDate(selected)}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {selectedItems.length === 0 && <div className="lf-empty" style={{ padding: 0 }}>{emptyLabel}</div>}
        {selectedItems.map((text, i) => (
          <div key={i} style={{ fontSize: 13.5 }}>{text}</div>
        ))}
      </div>
    </div>
  );
}

// ---------- TODAY ----------
function TodayTab({ today, habitsData, updateHabits, journalData, fitnessData, updateFitness, plannerData, profileData, exportData, resetAllData, setTab }) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const doneToday = (habitsData.logs[today] || []).length;
  const totalHabits = habitsData.habits.length;
  const waterToday = fitnessData.water[today] || 0;
  const todosLeft = plannerData.todos.filter((t) => !t.done);

  const pct = totalHabits > 0 ? Math.round((doneToday / totalHabits) * 100) : 0;
  const moon = useMemo(() => getMoonPhase(), [today]);

  const [weather, setWeather] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&current_weather=true&timezone=auto`);
        const json = await res.json();
        if (!cancelled && json && json.current_weather) {
          setWeather({ tempC: Math.round(json.current_weather.temperature), code: json.current_weather.weathercode });
        }
      } catch (e) {
        // keep previous/loading state if the fetch fails
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  const weatherInfo = weather ? weatherCodeInfo(weather.code) : null;

  const toggleHabit = (id) => {
    const set = new Set(habitsData.logs[today] || []);
    set.has(id) ? set.delete(id) : set.add(id);
    updateHabits({ ...habitsData, logs: { ...habitsData.logs, [today]: Array.from(set) } });
  };
  const addWater = (delta) => {
    updateFitness({ ...fitnessData, water: { ...fitnessData.water, [today]: Math.max(0, waterToday + delta) } });
  };

  // recent activity feed
  const feed = useMemo(() => {
    const items = [];
    fitnessData.exercise.slice(0, 3).forEach((e) => items.push({ id: e.id, icon: Dumbbell, tint: "var(--tint-green)", title: e.activity, sub: e.date === today ? "Today" : niceDate(e.date), color: "#5F8F6B" }));
    fitnessData.meals.slice(0, 3).forEach((m) => items.push({ id: m.id, icon: Utensils, tint: "var(--tint-pink)", title: `${m.mealType}: ${m.desc}`, sub: m.date === today ? "Today" : niceDate(m.date), color: "#C79A5C" }));
    journalData.entries.slice(0, 2).forEach((e) => items.push({ id: e.id, icon: Sparkles, tint: "var(--tint-lav)", title: `Feeling ${MOODS.find((m) => m.v === e.mood)?.label.toLowerCase()}`, sub: e.date === today ? "Today" : niceDate(e.date), color: "#B892C9" }));
    return items.slice(0, 4);
  }, [fitnessData, journalData, today]);

  return (
    <>
      <div className="lf-row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="lf-label">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
          <div className="lf-row" style={{ gap: 5, marginTop: 5 }}>
            {weatherInfo ? <weatherInfo.Icon size={14} color="var(--muted)" strokeWidth={1.6} /> : <Cloud size={14} color="var(--muted)" strokeWidth={1.6} />}
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {weatherInfo ? `${weatherInfo.label} · ${weather.tempC}°C` : "Fetching weather…"}
            </span>
          </div>
        </div>
      </div>

      <div className="lf-orb-wrap">
        <div className="lf-orb" />
        <div className="lf-orb-shine" />
      </div>

      <div style={{ textAlign: "center", padding: "6px 0 2px" }}>
        <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 30, lineHeight: 1.15 }}>
          {greetingWord()}, {profileData.name || "there"}
        </div>
        <div className="lf-row" style={{ justifyContent: "center", gap: 6, marginTop: 12, cursor: "pointer" }} onClick={() => setTab("journal")}>
          <Scale size={14} color="var(--muted)" strokeWidth={1.6} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Libra · today's horoscope</span>
        </div>
        <div className="lf-row" style={{ justifyContent: "center", gap: 6, marginTop: 6 }}>
          <Moon size={14} color="var(--muted)" strokeWidth={1.6} />
          <span style={{ fontSize: 12, color: "var(--muted)" }}>{moon.name}</span>
        </div>
      </div>

      {totalHabits > 0 && (
        <div>
          <div className="lf-row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
            <span className="lf-label">Today's progress</span>
            <span className="lf-label" style={{ color: "var(--rose)" }}>{pct}%</span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "rgba(43,34,37,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg,#E9A9BE,#D14D7C)", borderRadius: 999, transition: "width 0.3s" }} />
          </div>
        </div>
      )}

      <div className="lf-row" style={{ gap: 10 }}>
        <StatTile icon={CheckSquare} tint="var(--tint-pink)" iconColor="var(--rose)" value={`${doneToday}/${totalHabits}`} label="Habits" caption={totalHabits === 0 ? "Add one" : doneToday === totalHabits ? "All clear" : "In progress"} />
        <StatTile icon={Droplet} tint="var(--tint-blue)" iconColor="#5C86BF" value={`${waterToday}`} label="Cups" caption={waterToday >= profileData.waterGoal ? "Well hydrated" : "Keep sipping"} onQuickAdd={() => addWater(1)} />
        <StatTile icon={ListChecks} tint="var(--tint-green)" iconColor="#5F8F6B" value={`${todosLeft.length}`} label="To-dos" caption={todosLeft.length === 0 ? "All clear" : "Pending"} />
      </div>

      {totalHabits > 0 && (
        <div>
          <div className="lf-label" style={{ marginBottom: 10 }}>Habit check-in</div>
          <div className="lf-card" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {habitsData.habits.map((h) => {
              const done = (habitsData.logs[today] || []).includes(h.id);
              return (
                <div key={h.id} className="lf-chip" onClick={() => toggleHabit(h.id)}
                  style={{ borderColor: done ? h.color : "var(--line)", background: done ? h.color + "1A" : "#fff" }}>
                  <span className="lf-dot" style={{ background: h.color }} />
                  {h.name}
                  {done && <Check size={13} color={h.color} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {feed.length > 0 && (
        <div>
          <div className="lf-row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <span className="lf-label">Recent activity</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {feed.map((item) => (
              <div key={item.id} className="lf-card" style={{ padding: "12px 14px" }}>
                <div className="lf-row" style={{ justifyContent: "space-between" }}>
                  <div className="lf-row">
                    <div style={{ width: 34, height: 34, borderRadius: 12, background: item.tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <item.icon size={15} color={item.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{item.sub}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Quick actions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <QuickTile icon={Plus} tint="var(--tint-pink)" iconColor="var(--rose)" label="Log water" onClick={() => addWater(1)} />
          <QuickTile icon={CheckSquare} tint="var(--tint-green)" iconColor="#5F8F6B" label="Add habit" onClick={() => setTab("habits")} />
          <QuickTile icon={BookOpen} tint="var(--tint-lav)" iconColor="#8A6FA3" label="Journal" onClick={() => setTab("journal")} />
          <QuickTile icon={ListChecks} tint="var(--tint-blue)" iconColor="#5C86BF" label="Add to-do" onClick={() => setTab("planner")} />
        </div>
      </div>

      <Collapsible title="Settings" defaultOpen={false}>
        <div className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <button className="lf-btn" style={{ width: "100%" }} onClick={exportData}>Export my data (.json)</button>
          <hr className="lf-divider" />
          {!confirmingReset ? (
            <button className="lf-btn-ghost" style={{ width: "100%", color: "var(--rose-deep)" }} onClick={() => setConfirmingReset(true)}>
              Reset all data
            </button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center" }}>
                This clears everything — habits, journal, fitness, planner, and profile. This can't be undone.
              </div>
              <div className="lf-row" style={{ gap: 8 }}>
                <button className="lf-btn-ghost" style={{ flex: 1 }} onClick={() => setConfirmingReset(false)}>Cancel</button>
                <button className="lf-btn" style={{ flex: 1, background: "var(--rose-deep)" }} onClick={() => { resetAllData(); setConfirmingReset(false); }}>
                  Yes, reset
                </button>
              </div>
            </div>
          )}
        </div>
      </Collapsible>

      <div className="lf-card lf-row" style={{ justifyContent: "space-between", cursor: "pointer" }} onClick={() => setTab("profile")}>
        <div className="lf-row">
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--tint-lav)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <User size={17} color="var(--muted)" strokeWidth={1.6} />
          </div>
          <span style={{ fontSize: 14.5, fontWeight: 500 }}>View profile</span>
        </div>
        <ChevronRight size={16} color="var(--muted)" />
      </div>
    </>
  );
}

function StatTile({ icon: Icon, tint, iconColor, value, label, caption, onQuickAdd }) {
  return (
    <div className="lf-card" style={{ flex: 1, padding: 14, background: tint, border: "1px solid rgba(255,255,255,0.7)" }} onClick={onQuickAdd}>
      <Icon size={16} color={iconColor} />
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{value}</div>
      <div className="lf-label" style={{ marginTop: 1 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--ink)", opacity: 0.65, marginTop: 4 }}>{caption}</div>
    </div>
  );
}

function QuickTile({ icon: Icon, tint, iconColor, label, onClick }) {
  return (
    <div className="lf-card" style={{ padding: 14, cursor: "pointer" }} onClick={onClick}>
      <div className="lf-row" style={{ justifyContent: "space-between" }}>
        <div style={{ width: 30, height: 30, borderRadius: 10, background: tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon size={14} color={iconColor} />
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 10 }}>{label}</div>
    </div>
  );
}

// ---------- HABITS ----------
function HabitsTab({ today, data, update, plannerData, updatePlanner }) {
  const [name, setName] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [goalText, setGoalText] = useState("");
  const [goalDue, setGoalDue] = useState("");

  const addHabit = () => {
    if (!name.trim()) return;
    const h = { id: uid(), name: name.trim(), color: HABIT_COLORS[colorIdx % HABIT_COLORS.length] };
    update({ ...data, habits: [...data.habits, h] });
    setName("");
    setColorIdx((i) => i + 1);
  };
  const deleteHabit = (id) => {
    const habits = data.habits.filter((h) => h.id !== id);
    const logs = {};
    Object.entries(data.logs).forEach(([d, ids]) => { logs[d] = ids.filter((x) => x !== id); });
    update({ habits, logs });
  };
  const toggle = (id, dstr) => {
    const set = new Set(data.logs[dstr] || []);
    set.has(id) ? set.delete(id) : set.add(id);
    update({ ...data, logs: { ...data.logs, [dstr]: Array.from(set) } });
  };
  const streak = (id) => {
    let count = 0, d = new Date();
    while (true) {
      const ds = dateStr(d);
      if ((data.logs[ds] || []).includes(id)) { count++; d.setDate(d.getDate() - 1); } else break;
    }
    return count;
  };
  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); arr.push(dateStr(d)); }
    return arr;
  }, [today]);

  const addGoal = () => {
    if (!goalText.trim()) return;
    updatePlanner({ ...plannerData, goals: [{ id: uid(), text: goalText.trim(), due: goalDue, done: false }, ...plannerData.goals] });
    setGoalText(""); setGoalDue("");
  };
  const toggleGoal = (id) => updatePlanner({ ...plannerData, goals: plannerData.goals.map((g) => g.id === id ? { ...g, done: !g.done } : g) });
  const deleteGoal = (id) => updatePlanner({ ...plannerData, goals: plannerData.goals.filter((g) => g.id !== id) });

  // ---- weekly report ----
  const weekDays = last7;
  const weekLabels = weekDays.map((ds) => new Date(ds).toLocaleDateString(undefined, { weekday: "narrow" }));
  const totalPossible = data.habits.length * weekDays.length;
  const totalDone = weekDays.reduce((sum, ds) => sum + (data.logs[ds] || []).length, 0);
  const metPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
  const bestCurrentStreak = data.habits.reduce((max, h) => Math.max(max, streak(h.id)), 0);
  const bestOverallStreak = useMemo(() => {
    let best = 0;
    data.habits.forEach((h) => {
      let running = 0;
      const allDates = Object.keys(data.logs).sort();
      allDates.forEach((ds) => {
        if ((data.logs[ds] || []).includes(h.id)) { running++; best = Math.max(best, running); }
        else running = 0;
      });
    });
    return best;
  }, [data]);

  return (
    <>
      <div className="lf-label" style={{ fontSize: 12 }}>Habits</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26 }}>Keep the streak alive</div>

      <div className="lf-card lf-row">
        <input className="lf-input" placeholder="e.g. Read 10 pages" value={name}
          onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addHabit()} />
        <button className="lf-btn" onClick={addHabit}><Plus size={16} /></button>
      </div>

      <Collapsible title="Your habits" defaultOpen={true}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.habits.length === 0 && <div className="lf-empty">No habits yet — add your first one above.</div>}
          {data.habits.map((h) => (
            <div key={h.id} className="lf-card">
              <div className="lf-row" style={{ justifyContent: "space-between" }}>
                <div className="lf-row">
                  <span className="lf-dot" style={{ background: h.color, width: 9, height: 9 }} />
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{h.name}</span>
                </div>
                <div className="lf-row">
                  {streak(h.id) > 0 && (
                    <span className="lf-row" style={{ gap: 4, color: "var(--rose)", fontSize: 12.5 }}>
                      <Flame size={13} /> {streak(h.id)}
                    </span>
                  )}
                  <button className="lf-icon-btn" onClick={() => deleteHabit(h.id)}><Trash2 size={15} /></button>
                </div>
              </div>
              <div className="lf-row" style={{ marginTop: 12, gap: 6 }}>
                {last7.map((ds) => {
                  const on = (data.logs[ds] || []).includes(h.id);
                  return (
                    <div key={ds} onClick={() => toggle(h.id, ds)} title={ds}
                      style={{
                        width: 28, height: 28, borderRadius: 10, cursor: "pointer",
                        background: on ? h.color : "var(--tint-lav)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10.5, color: on ? "#fff" : "var(--muted)", fontWeight: 500,
                      }}>
                      {new Date(ds).getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Collapsible>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Goals</div>
        <div className="lf-card" style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="lf-input" placeholder="A goal you're working toward" value={goalText} onChange={(e) => setGoalText(e.target.value)} />
          <div className="lf-row">
            <input className="lf-input" type="date" value={goalDue} onChange={(e) => setGoalDue(e.target.value)} />
            <button className="lf-btn" onClick={addGoal}><Plus size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {plannerData.goals.length === 0 && <div className="lf-empty">No goals yet.</div>}
          {plannerData.goals.map((g) => (
            <div key={g.id} className="lf-card lf-row" style={{ justifyContent: "space-between", padding: "11px 14px" }}>
              <div className="lf-row" style={{ cursor: "pointer" }} onClick={() => toggleGoal(g.id)}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1.5px solid var(--rose-soft)", background: g.done ? "var(--rose)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {g.done && <Check size={11} color="#fff" />}
                </div>
                <span style={{ fontSize: 14, textDecoration: g.done ? "line-through" : "none", color: g.done ? "var(--muted)" : "var(--ink)" }}>
                  {g.text}{g.due && <span style={{ color: "var(--muted)", fontSize: 12 }}> · due {g.due}</span>}
                </span>
              </div>
              <button className="lf-icon-btn" onClick={() => deleteGoal(g.id)}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      </div>

      {data.habits.length > 0 && (
        <div>
          <div className="lf-label" style={{ marginBottom: 10 }}>Tracker & reports</div>
          <div className="lf-card" style={{ marginBottom: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: `minmax(70px,1fr) repeat(${weekDays.length}, 20px)`, gap: 6, alignItems: "center", marginBottom: 8 }}>
              <div />
              {weekLabels.map((w, i) => (
                <div key={i} style={{ textAlign: "center", fontSize: 9.5, color: "var(--muted)" }}>{w}</div>
              ))}
            </div>
            {data.habits.map((h) => (
              <div key={h.id} style={{ display: "grid", gridTemplateColumns: `minmax(70px,1fr) repeat(${weekDays.length}, 20px)`, gap: 6, alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</div>
                {weekDays.map((ds) => {
                  const on = (data.logs[ds] || []).includes(h.id);
                  return <div key={ds} style={{ width: 10, height: 10, borderRadius: "50%", margin: "0 auto", background: on ? h.color : "var(--line)" }} />;
                })}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="lf-card" style={{ padding: 14, background: "var(--tint-pink)" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{metPct}%</div>
              <div className="lf-label" style={{ marginTop: 1 }}>Met this week</div>
            </div>
            <div className="lf-card" style={{ padding: 14, background: "var(--tint-blue)" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{totalDone}</div>
              <div className="lf-label" style={{ marginTop: 1 }}>Total done</div>
            </div>
            <div className="lf-card" style={{ padding: 14, background: "var(--tint-green)" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{bestCurrentStreak}</div>
              <div className="lf-label" style={{ marginTop: 1 }}>Current streak</div>
            </div>
            <div className="lf-card" style={{ padding: 14, background: "var(--tint-lav)" }}>
              <div style={{ fontSize: 20, fontWeight: 700 }}>{bestOverallStreak}</div>
              <div className="lf-label" style={{ marginTop: 1 }}>Best streak</div>
            </div>
          </div>
        </div>
      )}

      {data.habits.length > 0 && (
        <Collapsible title="Habit history" defaultOpen={false}>
          <LogCalendar
            today={today}
            color="var(--rose)"
            getIntensity={(ds) => data.habits.length > 0 ? (data.logs[ds] || []).length / data.habits.length : 0}
            getDayItems={(ds) => (data.logs[ds] || []).map((id) => data.habits.find((h) => h.id === id)?.name).filter(Boolean)}
            emptyLabel="No habits completed."
          />
        </Collapsible>
      )}
    </>
  );
}

// ---------- JOURNAL (horoscope + mood log) ----------
function JournalTab({ today, data, update }) {
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState("");
  const [bookInput, setBookInput] = useState(data.currentBook || "");
  const horoscope = dailyHoroscope();

  const addEntry = () => {
    if (!mood) return;
    const e = { id: uid(), date: today, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), mood, note: note.trim() };
    update({ ...data, entries: [e, ...data.entries] });
    setMood(null); setNote("");
  };
  const deleteEntry = (id) => update({ ...data, entries: data.entries.filter((e) => e.id !== id) });
  const saveBook = () => update({ ...data, currentBook: bookInput.trim() });

  return (
    <>
      <div className="lf-label" style={{ fontSize: 12 }}>Journal</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26 }}>Libra</div>

      <div className="lf-card" style={{ textAlign: "center", padding: "24px 20px" }}>
        <div className="lf-glossy" style={{
          width: 56, height: 56, margin: "0 auto 14px",
          background: "radial-gradient(circle at 35% 30%, #C9A9E8, #8A6FA3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}><Scale size={24} color="#fff" strokeWidth={1.6} /></div>
        <div className="lf-label" style={{ marginBottom: 8 }}>Today's horoscope</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{horoscope}</div>
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Currently reading</div>
        <div className="lf-card lf-row">
          <BookOpen size={17} color="#8A6FA3" strokeWidth={1.6} />
          <input className="lf-input" style={{ border: "none", background: "transparent", padding: "4px 2px" }}
            placeholder="Title of the book you're reading"
            value={bookInput}
            onChange={(e) => setBookInput(e.target.value)}
            onBlur={saveBook}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()} />
        </div>
      </div>

      <div className="lf-label" style={{ fontSize: 12, marginTop: 2 }}>How's today going</div>

      <div className="lf-card">
        <div className="lf-row" style={{ justifyContent: "space-between", marginBottom: 14 }}>
          {MOODS.map((m) => (
            <div key={m.v} onClick={() => setMood(m.v)} style={{ textAlign: "center", cursor: "pointer" }}>
              <div className="lf-glossy" style={{
                width: 46, height: 46,
                background: `radial-gradient(circle at 35% 30%, ${m.color}CC, ${m.color})`,
                outline: mood === m.v ? "2.5px solid var(--rose-deep)" : "none", outlineOffset: 2,
              }} />
              <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 6, textTransform: "uppercase" }}>{m.label}</div>
            </div>
          ))}
        </div>
        <textarea className="lf-input" placeholder="A line or two about the day (optional)" rows={3}
          value={note} onChange={(e) => setNote(e.target.value)} style={{ resize: "none", marginBottom: 10 }} />
        <button className="lf-btn" style={{ width: "100%" }} onClick={addEntry}>Log entry</button>
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Past entries</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.entries.length === 0 && <div className="lf-empty">Your entries will appear here.</div>}
          {data.entries.map((e) => (
            <div key={e.id} className="lf-card">
              <div className="lf-row" style={{ justifyContent: "space-between" }}>
                <div className="lf-row" style={{ gap: 8 }}>
                  <span className="lf-glossy" style={{ width: 20, height: 20, background: MOODS.find((m) => m.v === e.mood)?.color }} />
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>{e.date === today ? "Today" : niceDate(e.date)} · {e.time}</span>
                </div>
                <button className="lf-icon-btn" onClick={() => deleteEntry(e.id)}><Trash2 size={14} /></button>
              </div>
              {e.note && <div style={{ fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>{e.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ---------- FITNESS ----------
function FitnessTab({ today, data, update, waterGoal = 6 }) {
  const [activity, setActivity] = useState("");
  const [duration, setDuration] = useState("");
  const [exerciseDate, setExerciseDate] = useState(today);
  const [mealType, setMealType] = useState(MEAL_TYPES[0]);
  const [mealDesc, setMealDesc] = useState("");
  const [mealDate, setMealDate] = useState(today);

  const waterToday = data.water[today] || 0;
  const addWater = (delta) => update({ ...data, water: { ...data.water, [today]: Math.max(0, waterToday + delta) } });

  const addExercise = () => {
    if (!activity.trim()) return;
    const e = { id: uid(), date: exerciseDate || today, activity: activity.trim(), duration: duration.trim() };
    update({ ...data, exercise: [e, ...data.exercise] });
    setActivity(""); setDuration(""); setExerciseDate(today);
  };
  const deleteExercise = (id) => update({ ...data, exercise: data.exercise.filter((e) => e.id !== id) });

  const addMeal = () => {
    if (!mealDesc.trim()) return;
    const m = { id: uid(), date: mealDate || today, mealType, desc: mealDesc.trim() };
    update({ ...data, meals: [m, ...data.meals] });
    setMealDesc(""); setMealDate(today);
  };
  const deleteMeal = (id) => update({ ...data, meals: data.meals.filter((m) => m.id !== id) });

  const [weightInput, setWeightInput] = useState("");
  const weights = data.weights || [];
  const sortedWeights = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights]);
  const latestWeight = sortedWeights[sortedWeights.length - 1];
  const prevWeight = sortedWeights[sortedWeights.length - 2];
  const weightDelta = latestWeight && prevWeight ? +(latestWeight.kg - prevWeight.kg).toFixed(1) : null;
  const addWeight = () => {
    const val = parseFloat(weightInput);
    if (!val || val <= 0) return;
    const existing = weights.find((w) => w.date === today);
    const nextWeights = existing
      ? weights.map((w) => w.date === today ? { ...w, kg: val } : w)
      : [...weights, { id: uid(), date: today, kg: val }];
    update({ ...data, weights: nextWeights });
    setWeightInput("");
  };
  const deleteWeight = (id) => update({ ...data, weights: weights.filter((w) => w.id !== id) });
  const chartData = sortedWeights.slice(-10).map((w) => ({ date: w.date.slice(5), kg: w.kg }));

  const todaysExercise = data.exercise.filter((e) => e.date === today);
  const todaysMeals = data.meals.filter((m) => m.date === today);

  // ---- exercise weekly report ----
  const weekDays = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); arr.push(dateStr(d)); }
    return arr;
  }, [today]);
  const weekLabels = weekDays.map((ds) => new Date(ds).toLocaleDateString(undefined, { weekday: "narrow" }));
  const weekActivities = useMemo(() => {
    const names = new Set();
    weekDays.forEach((ds) => data.exercise.filter((e) => e.date === ds).forEach((e) => names.add(e.activity)));
    return Array.from(names);
  }, [data.exercise, weekDays]);
  const daysActive = weekDays.filter((ds) => data.exercise.some((e) => e.date === ds)).length;
  const totalWorkouts = weekDays.reduce((sum, ds) => sum + data.exercise.filter((e) => e.date === ds).length, 0);
  const exerciseCurrentStreak = useMemo(() => {
    let count = 0, d = new Date();
    while (true) {
      const ds = dateStr(d);
      if (data.exercise.some((e) => e.date === ds)) { count++; d.setDate(d.getDate() - 1); } else break;
    }
    return count;
  }, [data.exercise, today]);
  const exerciseBestStreak = useMemo(() => {
    const datesWithExercise = Array.from(new Set(data.exercise.map((e) => e.date))).sort();
    let best = 0, running = 0, prev = null;
    datesWithExercise.forEach((ds) => {
      if (prev) {
        const prevDate = new Date(prev); prevDate.setDate(prevDate.getDate() + 1);
        if (dateStr(prevDate) === ds) running++; else running = 1;
      } else running = 1;
      best = Math.max(best, running);
      prev = ds;
    });
    return best;
  }, [data.exercise]);

  return (
    <>
      <div className="lf-label" style={{ fontSize: 12 }}>Fitness</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26 }}>Body & fuel</div>

      <div className="lf-row" style={{ gap: 10 }}>
        <StatTile icon={Droplet} tint="var(--tint-blue)" iconColor="#5C86BF" value={`${waterToday}`} label="Cups" caption={waterToday >= waterGoal ? "Goal met" : `Goal: ${waterGoal}`} onQuickAdd={() => addWater(1)} />
        <StatTile icon={Dumbbell} tint="var(--tint-green)" iconColor="#5F8F6B" value={`${todaysExercise.length}`} label="Workouts" caption="Today" />
        <StatTile icon={Utensils} tint="var(--tint-pink)" iconColor="var(--rose)" value={`${todaysMeals.length}`} label="Meals" caption="Logged" />
      </div>

      <div className="lf-card lf-row" style={{ justifyContent: "space-between" }}>
        <div className="lf-row"><Droplet size={17} color="#5C86BF" /><span style={{ fontSize: 14.5 }}>{waterToday} cups today</span></div>
        <div className="lf-row">
          <button className="lf-btn-ghost" onClick={() => addWater(-1)}>–</button>
          <button className="lf-btn" onClick={() => addWater(1)}>+</button>
        </div>
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Exercise</div>
        <div className="lf-card" style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <input className="lf-input" placeholder="Activity (e.g. Run, gym, yoga)" value={activity} onChange={(e) => setActivity(e.target.value)} />
          <div className="lf-row">
            <input className="lf-input" placeholder="Duration (e.g. 30 min)" value={duration} onChange={(e) => setDuration(e.target.value)} />
            <input className="lf-input" type="date" style={{ flex: "0 0 140px" }} value={exerciseDate} max={today} onChange={(e) => setExerciseDate(e.target.value)} />
            <button className="lf-btn" onClick={addExercise}><Plus size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todaysExercise.length === 0 && <div className="lf-empty">No exercise logged today.</div>}
          {todaysExercise.map((e) => (
            <div key={e.id} className="lf-card lf-row" style={{ justifyContent: "space-between", padding: "12px 14px" }}>
              <div className="lf-row"><Dumbbell size={15} color="#5F8F6B" /><span style={{ fontSize: 14 }}>{e.activity}{e.duration && ` · ${e.duration}`}</span></div>
              <button className="lf-icon-btn" onClick={() => deleteExercise(e.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        {todaysExercise.length > 0 || data.exercise.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <div className="lf-label" style={{ marginBottom: 10 }}>Tracker & reports</div>
            <div className="lf-card" style={{ marginBottom: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: `minmax(70px,1fr) repeat(${weekDays.length}, 20px)`, gap: 6, alignItems: "center", marginBottom: 8 }}>
                <div />
                {weekLabels.map((w, i) => (
                  <div key={i} style={{ textAlign: "center", fontSize: 9.5, color: "var(--muted)" }}>{w}</div>
                ))}
              </div>
              {weekActivities.length === 0 && <div className="lf-empty" style={{ padding: 0 }}>No exercise this week yet.</div>}
              {weekActivities.map((name) => (
                <div key={name} style={{ display: "grid", gridTemplateColumns: `minmax(70px,1fr) repeat(${weekDays.length}, 20px)`, gap: 6, alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                  {weekDays.map((ds) => {
                    const on = data.exercise.some((e) => e.date === ds && e.activity === name);
                    return <div key={ds} style={{ width: 10, height: 10, borderRadius: "50%", margin: "0 auto", background: on ? "#8FA88F" : "var(--line)" }} />;
                  })}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div className="lf-card" style={{ padding: 14, background: "var(--tint-green)" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{daysActive}/7</div>
                <div className="lf-label" style={{ marginTop: 1 }}>Active days</div>
              </div>
              <div className="lf-card" style={{ padding: 14, background: "var(--tint-blue)" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{totalWorkouts}</div>
                <div className="lf-label" style={{ marginTop: 1 }}>Total workouts</div>
              </div>
              <div className="lf-card" style={{ padding: 14, background: "var(--tint-pink)" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{exerciseCurrentStreak}</div>
                <div className="lf-label" style={{ marginTop: 1 }}>Current streak</div>
              </div>
              <div className="lf-card" style={{ padding: 14, background: "var(--tint-lav)" }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{exerciseBestStreak}</div>
                <div className="lf-label" style={{ marginTop: 1 }}>Best streak</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Food log</div>
        <div className="lf-card" style={{ marginBottom: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="lf-row" style={{ flexWrap: "wrap" }}>
            {MEAL_TYPES.map((t) => (
              <div key={t} className="lf-chip" onClick={() => setMealType(t)}
                style={{ borderColor: mealType === t ? "var(--rose)" : "var(--line)", background: mealType === t ? "var(--tint-pink)" : "#fff" }}>
                {t}
              </div>
            ))}
          </div>
          <div className="lf-row">
            <input className="lf-input" placeholder="What did you eat?" value={mealDesc} onChange={(e) => setMealDesc(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addMeal()} />
            <input className="lf-input" type="date" style={{ flex: "0 0 140px" }} value={mealDate} max={today} onChange={(e) => setMealDate(e.target.value)} />
            <button className="lf-btn" onClick={addMeal}><Plus size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todaysMeals.length === 0 && <div className="lf-empty">No meals logged today.</div>}
          {todaysMeals.map((m) => (
            <div key={m.id} className="lf-card lf-row" style={{ justifyContent: "space-between", padding: "12px 14px" }}>
              <div className="lf-row"><Utensils size={15} color="var(--rose)" /><span style={{ fontSize: 14 }}><b style={{ color: "var(--muted)", fontWeight: 500 }}>{m.mealType}: </b>{m.desc}</span></div>
              <button className="lf-icon-btn" onClick={() => deleteMeal(m.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Weight</div>
        <div className="lf-card" style={{ marginBottom: 10 }}>
          <div className="lf-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{latestWeight ? `${latestWeight.kg} kg` : "—"}</div>
              <div className="lf-label" style={{ marginTop: 1 }}>
                {weightDelta !== null ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg vs last entry` : "No entries yet"}
              </div>
            </div>
            <Scale size={22} color="var(--rose)" strokeWidth={1.6} />
          </div>
          {chartData.length > 1 && (
            <div style={{ height: 100, margin: "0 -6px 10px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--line)" }} />
                  <Line type="monotone" dataKey="kg" stroke="var(--rose)" strokeWidth={2} dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="lf-row">
            <input className="lf-input" type="number" step="0.1" placeholder="Weight in kg" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWeight()} />
            <button className="lf-btn" onClick={addWeight}><Plus size={16} /></button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sortedWeights.length === 0 && <div className="lf-empty">No weight logged yet.</div>}
          {[...sortedWeights].reverse().slice(0, 5).map((w) => (
            <div key={w.id} className="lf-card lf-row" style={{ justifyContent: "space-between", padding: "12px 14px" }}>
              <div className="lf-row"><Scale size={15} color="var(--rose)" /><span style={{ fontSize: 14 }}>{w.kg} kg <span style={{ color: "var(--muted)" }}>· {w.date === today ? "Today" : niceDate(w.date)}</span></span></div>
              <button className="lf-icon-btn" onClick={() => deleteWeight(w.id)}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      </div>

      <Collapsible title="Exercise history" defaultOpen={false}>
        <LogCalendar
          today={today}
          color="#8FA88F"
          getDayItems={(ds) => data.exercise.filter((e) => e.date === ds).map((e) => `${e.activity}${e.duration ? ` · ${e.duration}` : ""}`)}
          emptyLabel="No exercise logged."
        />
      </Collapsible>

      <Collapsible title="Food history" defaultOpen={false}>
        <LogCalendar
          today={today}
          color="#C79A5C"
          getDayItems={(ds) => data.meals.filter((m) => m.date === ds).map((m) => `${m.mealType}: ${m.desc}`)}
          emptyLabel="No meals logged."
        />
      </Collapsible>

      <Collapsible title="Weight history" defaultOpen={false}>
        <LogCalendar
          today={today}
          color="var(--rose)"
          getDayItems={(ds) => weights.filter((w) => w.date === ds).map((w) => `${w.kg} kg`)}
          emptyLabel="No weight logged."
        />
      </Collapsible>
    </>
  );
}

// ---------- PLANNER (todos + calendar) ----------
function PlannerTab({ today, data, update }) {
  const [todoText, setTodoText] = useState("");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [selectedDate, setSelectedDate] = useState(today);
  const [eventTitle, setEventTitle] = useState("");
  const [eventTime, setEventTime] = useState("");

  const addTodo = () => {
    if (!todoText.trim()) return;
    update({ ...data, todos: [{ id: uid(), text: todoText.trim(), done: false }, ...data.todos] });
    setTodoText("");
  };
  const completeTodo = (id) => {
    const t = data.todos.find((t) => t.id === id);
    if (!t) return;
    const historyEntry = { id: t.id, text: t.text, date: today };
    update({
      ...data,
      todos: data.todos.filter((x) => x.id !== id),
      todoHistory: [historyEntry, ...(data.todoHistory || [])],
    });
  };
  const deleteTodo = (id) => update({ ...data, todos: data.todos.filter((t) => t.id !== id) });

  const addEvent = () => {
    if (!eventTitle.trim()) return;
    update({ ...data, events: [...data.events, { id: uid(), date: selectedDate, time: eventTime.trim(), title: eventTitle.trim() }] });
    setEventTitle(""); setEventTime("");
  };
  const deleteEvent = (id) => update({ ...data, events: data.events.filter((e) => e.id !== id) });

  const eventDates = useMemo(() => new Set(data.events.map((e) => e.date)), [data.events]);
  const grid = useMemo(() => {
    const first = new Date(calMonth.y, calMonth.m, 1);
    const startDay = first.getDay();
    const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
  }, [calMonth]);
  const monthLabel = new Date(calMonth.y, calMonth.m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayEvents = data.events.filter((e) => e.date === selectedDate).sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  return (
    <>
      <div className="lf-label" style={{ fontSize: 12 }}>Planner</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26 }}>To-dos & schedule</div>

      <div>
        <div className="lf-card lf-row" style={{ marginBottom: 14 }}>
          <input className="lf-input" placeholder="Add a to-do" value={todoText} onChange={(e) => setTodoText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTodo()} />
          <button className="lf-btn" onClick={addTodo}><Plus size={16} /></button>
        </div>
        <Collapsible title="Your to-dos" defaultOpen={true}>
          {data.todos.length === 0 && <div className="lf-empty">Nothing on the list.</div>}
          <div>
            {data.todos.map((t, i) => (
              <div key={t.id} className="lf-row" style={{ alignItems: "stretch", gap: 14 }}>
                <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className="lf-glossy" onClick={() => completeTodo(t.id)} style={{
                    width: 32, height: 32, flexShrink: 0, cursor: "pointer",
                    background: HABIT_COLORS[i % HABIT_COLORS.length] + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Check size={12} color={HABIT_COLORS[i % HABIT_COLORS.length]} strokeWidth={2.4} />
                  </div>
                  {i < data.todos.length - 1 && <div style={{ flex: 1, width: 2, background: "var(--line)", marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, paddingTop: 6, paddingBottom: 18 }}>
                  <div onClick={() => completeTodo(t.id)} style={{ fontSize: 14.5, fontWeight: 500, cursor: "pointer" }}>{t.text}</div>
                </div>
                <button className="lf-icon-btn" style={{ paddingTop: 4 }} onClick={() => deleteTodo(t.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </Collapsible>
      </div>

      <Collapsible title="To-do history" defaultOpen={false}>
        <LogCalendar
          today={today}
          color="var(--rose)"
          getDayItems={(ds) => (data.todoHistory || []).filter((h) => h.date === ds).map((h) => h.text)}
          emptyLabel="Nothing completed."
        />
      </Collapsible>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Calendar</div>
        <div className="lf-card">
          <div className="lf-row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
            <button className="lf-icon-btn" onClick={() => setCalMonth((c) => { const m = c.m - 1; return m < 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m }; })}><ChevronLeft size={16} /></button>
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 16 }}>{monthLabel}</span>
            <button className="lf-icon-btn" onClick={() => setCalMonth((c) => { const m = c.m + 1; return m > 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m }; })}><ChevronRight size={16} /></button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 10, color: "var(--muted)" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
            {grid.map((d, i) => {
              if (!d) return <div key={i} />;
              const ds = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const isToday = ds === today;
              const isSelected = ds === selectedDate;
              const hasEvent = eventDates.has(ds);
              return (
                <div key={i} onClick={() => setSelectedDate(ds)}
                  style={{
                    textAlign: "center", padding: "7px 0", borderRadius: 10, cursor: "pointer", fontSize: 12.5, position: "relative",
                    background: isSelected ? "var(--rose)" : isToday ? "var(--tint-pink)" : "transparent",
                    color: isSelected ? "#fff" : "var(--ink)",
                  }}>
                  {d}
                  {hasEvent && <div className="lf-dot" style={{ background: isSelected ? "#fff" : "var(--rose)", position: "absolute", bottom: 2, left: "50%", transform: "translateX(-50%)", width: 4, height: 4 }} />}
                </div>
              );
            })}
          </div>

          <hr className="lf-divider" style={{ margin: "14px 0" }} />
          <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>{selectedDate === today ? "Today" : niceDate(selectedDate)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
            {dayEvents.length === 0 && <div className="lf-empty" style={{ padding: 0 }}>No events.</div>}
            {dayEvents.map((e) => (
              <div key={e.id} className="lf-row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 13.5 }}>{e.time && <b style={{ color: "var(--muted)", fontWeight: 500 }}>{e.time} · </b>}{e.title}</span>
                <button className="lf-icon-btn" onClick={() => deleteEvent(e.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="lf-row">
            <input className="lf-input" style={{ flex: 2 }} placeholder="Event title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} />
            <input className="lf-input" style={{ flex: 1 }} placeholder="Time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
            <button className="lf-btn" onClick={addEvent}><Plus size={16} /></button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------- HISTORY (exercise, food, habit logs) ----------
function HistoryTab({ today, habitsData, fitnessData }) {
  return (
    <>
      <div className="lf-label" style={{ fontSize: 12 }}>History</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26 }}>Your log history</div>

      <Collapsible title="Habit history" defaultOpen={true}>
        <LogCalendar
          today={today}
          color="var(--rose)"
          getIntensity={(ds) => habitsData.habits.length > 0 ? (habitsData.logs[ds] || []).length / habitsData.habits.length : 0}
          getDayItems={(ds) => (habitsData.logs[ds] || []).map((id) => habitsData.habits.find((h) => h.id === id)?.name).filter(Boolean)}
          emptyLabel="No habits completed."
        />
      </Collapsible>

      <Collapsible title="Exercise history" defaultOpen={true}>
        <LogCalendar
          today={today}
          color="#8FA88F"
          getDayItems={(ds) => fitnessData.exercise.filter((e) => e.date === ds).map((e) => `${e.activity}${e.duration ? ` · ${e.duration}` : ""}`)}
          emptyLabel="No exercise logged."
        />
      </Collapsible>

      <Collapsible title="Food history" defaultOpen={true}>
        <LogCalendar
          today={today}
          color="#C79A5C"
          getDayItems={(ds) => fitnessData.meals.filter((m) => m.date === ds).map((m) => `${m.mealType}: ${m.desc}`)}
          emptyLabel="No meals logged."
        />
      </Collapsible>

      <Collapsible title="Weight history" defaultOpen={true}>
        <LogCalendar
          today={today}
          color="var(--rose)"
          getDayItems={(ds) => (fitnessData.weights || []).filter((w) => w.date === ds).map((w) => `${w.kg} kg`)}
          emptyLabel="No weight logged."
        />
      </Collapsible>
    </>
  );
}

// ---------- PROFILE ----------
const ACTIVITY_LEVELS = ["Sedentary", "Light", "Moderate", "Active", "Very active"];

function ProfileTab({ data, update, setTab }) {
  const [form, setForm] = useState(data);
  useEffect(() => { setForm(data); }, [data]);

  const commit = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    update(next);
  };
  const onField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const onBlurField = (key) => () => update({ ...form, [key]: form[key] });

  const heightM = parseFloat(form.heightCm) / 100;
  const weightKg = parseFloat(form.weightKg);
  const bmi = heightM > 0 && weightKg > 0 ? +(weightKg / (heightM * heightM)).toFixed(1) : null;
  const bmiLabel = bmi === null ? null
    : bmi < 18.5 ? "Underweight"
    : bmi < 25 ? "Healthy range"
    : bmi < 30 ? "Overweight"
    : "Higher range";

  return (
    <>
      <div className="lf-row" style={{ justifyContent: "space-between" }}>
        <button className="lf-icon-btn" style={{ padding: "4px 0" }} onClick={() => setTab("today")}>
          <ChevronLeft size={18} /> <span style={{ fontSize: 13 }}>Home</span>
        </button>
      </div>
      <div className="lf-label" style={{ fontSize: 12 }}>Profile</div>
      <div style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 26 }}>About you</div>

      <div className="lf-card" style={{ textAlign: "center", padding: "24px 20px" }}>
        <div style={{ margin: "0 auto 14px", display: "flex", justifyContent: "center" }}>
          <ProfileMark name={form.name} auraKey={form.auraColor} size={64} />
        </div>
        <input className="lf-input" style={{ textAlign: "center", fontSize: 16, fontWeight: 500, marginBottom: 14 }}
          placeholder="Your name" value={form.name} onChange={onField("name")} onBlur={onBlurField("name")} />
        <div className="lf-row" style={{ justifyContent: "center", gap: 10 }}>
          {AURA_PALETTE.map((p) => (
            <div key={p.key} onClick={() => commit({ auraColor: p.key })} title={p.label}
              style={{
                width: 24, height: 24, borderRadius: "50%", cursor: "pointer",
                background: `radial-gradient(circle at 35% 30%, ${p.c1}, ${p.c2})`,
                outline: form.auraColor === p.key ? "2px solid var(--rose-deep)" : "1px solid rgba(0,0,0,0.06)",
                outlineOffset: 2,
              }} />
          ))}
        </div>
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Body stats</div>
        <div className="lf-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="lf-row" style={{ gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>Age</div>
              <input className="lf-input" type="number" min="0" value={form.age} onChange={onField("age")} onBlur={onBlurField("age")} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>Height (cm)</div>
              <input className="lf-input" type="number" min="0" value={form.heightCm} onChange={onField("heightCm")} onBlur={onBlurField("heightCm")} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>Weight (kg)</div>
              <input className="lf-input" type="number" min="0" value={form.weightKg} onChange={onField("weightKg")} onBlur={onBlurField("weightKg")} />
            </div>
          </div>
          {bmi !== null && (
            <div className="lf-row" style={{ justifyContent: "space-between", padding: "10px 12px", background: "var(--tint-pink)", borderRadius: 12 }}>
              <span style={{ fontSize: 13 }}>BMI</span>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{bmi} · {bmiLabel}</span>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>Daily water goal (cups)</div>
            <input className="lf-input" type="number" min="1" value={form.waterGoal}
              onChange={(e) => setForm((f) => ({ ...f, waterGoal: e.target.value }))}
              onBlur={() => update({ ...form, waterGoal: Math.max(1, Number(form.waterGoal) || 1) })} />
          </div>
        </div>
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Activity level</div>
        <div className="lf-card" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {ACTIVITY_LEVELS.map((lvl) => (
            <div key={lvl} className="lf-chip" onClick={() => commit({ activityLevel: lvl })}
              style={{ borderColor: form.activityLevel === lvl ? "var(--rose)" : "var(--line)", background: form.activityLevel === lvl ? "var(--tint-pink)" : "#fff" }}>
              {lvl}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="lf-label" style={{ marginBottom: 10 }}>Current goal</div>
        <div className="lf-card">
          <input className="lf-input" placeholder="e.g. Build strength, lose weight, sleep better"
            value={form.goal} onChange={onField("goal")} onBlur={onBlurField("goal")} />
        </div>
      </div>
    </>
  );
}
