
/*
  Worker shell for the exhaustive solver.

  The next refactor should move the exact rules/state functions out of App.jsx
  into src/game/rules.js. Once that is done this Worker can import them and run
  the full solve without freezing React's UI thread.
*/
self.onmessage = async (event) => {
  const { type } = event.data || {};
  if (type === "ping") {
    self.postMessage({ type: "pong" });
    return;
  }
  if (type === "solve") {
    self.postMessage({
      type: "status",
      status: "rules-adapter-required",
      message:
        "探索器は追加済み。次にApp.jsx内の合法手生成・着手処理をsrc/game/rules.jsへ共通化すると全幅探索を開始できます。",
    });
  }
};
