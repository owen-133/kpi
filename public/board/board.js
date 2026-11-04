var tr = Array.isArray, Qn = Array.prototype.indexOf, It = Array.prototype.includes, rr = Array.from, $r = Object.defineProperty, ut = Object.getOwnPropertyDescriptor, $n = Object.getOwnPropertyDescriptors, ea = Object.prototype, ta = Array.prototype, en = Object.getPrototypeOf, Lr = Object.isExtensible;
const ra = () => {
};
function na(e) {
  for (var t = 0; t < e.length; t++)
    e[t]();
}
function tn() {
  var e, t, r = new Promise((n, a) => {
    e = n, t = a;
  });
  return { promise: r, resolve: e, reject: t };
}
const re = 2, _t = 4, nr = 8, rn = 1 << 24, be = 16, xe = 32, We = 64, hr = 128, xr = 256, Ce = 512, G = 1024, N = 2048, he = 4096, se = 8192, ee = 16384, bt = 32768, Kt = 1 << 25, pt = 65536, Zt = 1 << 17, aa = 1 << 18, Mt = 1 << 19, ia = 1 << 20, qe = 1 << 25, Xt = 1 << 21, ct = 1 << 22, Ge = 1 << 23, vt = /* @__PURE__ */ Symbol("$state"), nn = /* @__PURE__ */ Symbol("component"), sa = /* @__PURE__ */ Symbol("legacy props"), la = /* @__PURE__ */ Symbol(""), an = /* @__PURE__ */ Symbol("attributes"), dr = /* @__PURE__ */ Symbol("class"), _r = /* @__PURE__ */ Symbol("style"), pr = /* @__PURE__ */ Symbol("text"), Gt = /* @__PURE__ */ Symbol("form reset"), Dt = new class extends Error {
  name = "StaleReactionError";
  message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), oa = 1, fa = 2, sn = 4, ua = 8, ca = 16, va = 1, ha = 4, da = 8, _a = 16, ln = 1, pa = 2, on = {}, Y = /* @__PURE__ */ Symbol("uninitialized"), ga = "http://www.w3.org/1999/xhtml";
function ma() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function ka() {
  console.warn("https://svelte.dev/e/select_multiple_invalid_value");
}
function wa() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
function fn(e) {
  return e === this.v;
}
function ya(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function un(e) {
  return !ya(e, this.v);
}
function ba() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function Ma(e, t, r) {
  throw new Error("https://svelte.dev/e/each_key_duplicate");
}
function Ea(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function Ca() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function xa(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function Sa() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function Aa(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function Ta() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function za() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function qa() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function Ra() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
let ue = null;
function gt(e) {
  ue = e;
}
function Pt(e, t = !1, r) {
  ue = {
    p: ue,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: (
      /** @type {Effect} */
      T
    ),
    l: null
  };
}
function Ft(e) {
  var t = (
    /** @type {ComponentContext} */
    ue
  ), r = t.e;
  if (r !== null) {
    t.e = null;
    for (var n of r)
      qn(n);
  }
  return t.i = !0, ue = t.p, cn(e);
}
function cn(e = {}) {
  return $r(e, nn, { value: !0 }), e;
}
function vn() {
  return !0;
}
let Qe = [];
function hn() {
  var e = Qe;
  Qe = [], na(e);
}
function Ye(e) {
  if (Qe.length === 0 && !qt) {
    var t = Qe;
    queueMicrotask(() => {
      t === Qe && hn();
    });
  }
  Qe.push(e);
}
function Na() {
  for (; Qe.length > 0; )
    hn();
}
const Oa = -7169;
function F(e, t) {
  e.f = e.f & Oa | t;
}
function Sr(e) {
  (e.f & Ce) !== 0 || e.deps === null ? F(e, G) : F(e, he);
}
function dn(e, t) {
  (e.f & N) !== 0 ? t.set(e, N) : (e.f & he) !== 0 && t.get(e) !== N && t.set(e, he), F(e, G);
}
let jr = !1;
function Ia() {
  jr || (jr = !0, document.addEventListener(
    "reset",
    (e) => {
      Promise.resolve().then(() => {
        if (!e.defaultPrevented)
          for (
            const t of
            /**@type {HTMLFormElement} */
            e.target.elements
          )
            t[Gt]?.();
      });
    },
    // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
    { capture: !0 }
  ));
}
function Vt(e) {
  var t = S, r = T;
  me(null), Oe(null);
  try {
    return e();
  } finally {
    me(t), Oe(r);
  }
}
function _n(e, t, r, n = r) {
  e.addEventListener(t, () => Vt(r));
  const a = (
    /** @type {any} */
    e[Gt]
  );
  a ? e[Gt] = () => {
    a(), n(!0);
  } : e[Gt] = () => n(!0), Ia();
}
function La(e, t, r, n) {
  const a = Lt;
  var i = e.filter((h) => !h.settled), s = t.map(a);
  if (r.length === 0 && i.length === 0) {
    n(s);
    return;
  }
  var l = (
    /** @type {Effect} */
    T
  ), o = ja(), u = i.length === 1 ? i[0].promise : i.length > 1 ? Promise.all(i.map((h) => h.promise)) : null;
  function c(h) {
    if ((l.f & ee) === 0) {
      o();
      try {
        n([...s, ...h]);
      } catch (p) {
        ze(p, l);
      }
      Jt();
    }
  }
  var v = pn();
  if (r.length === 0) {
    u.then(() => c([])).finally(v);
    return;
  }
  function _() {
    Promise.all(r.map((h) => /* @__PURE__ */ Da(h))).then(c).catch((h) => ze(h, l)).finally(v);
  }
  u ? u.then(() => {
    if ((l.f & ee) !== 0) {
      v();
      return;
    }
    o(), _(), Jt();
  }) : _();
}
function ja() {
  var e = (
    /** @type {Effect} */
    T
  ), t = S, r = ue, n = (
    /** @type {Batch} */
    M
  );
  return function(i = !0) {
    Oe(e), me(t), gt(r), i && (e.f & ee) === 0 && (n?.activate(), n?.apply());
  };
}
function Jt(e = !0) {
  Oe(null), me(null), gt(null), e && M?.deactivate();
}
function pn() {
  var e = (
    /** @type {Effect} */
    T
  ), t = e.b, r = (
    /** @type {Batch} */
    M
  ), n = !!t?.is_rendered();
  return t?.update_pending_count(1, r), r.increment(n, e), () => {
    t?.update_pending_count(-1, r), r.decrement(n, e);
  };
}
// @__NO_SIDE_EFFECTS__
function Lt(e) {
  var t = re | N;
  return T !== null && (T.f |= Mt), {
    ctx: ue,
    deps: null,
    effects: null,
    equals: fn,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      Y
    ),
    wv: 0,
    parent: T,
    ac: null
  };
}
const At = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function Da(e, t, r) {
  let n = (
    /** @type {Effect | null} */
    T
  );
  n === null && ba();
  var a = (
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0
  ), i = at(
    /** @type {V} */
    Y
  ), s = !S, l = /* @__PURE__ */ new Set();
  return ti(() => {
    var o = (
      /** @type {Effect} */
      T
    ), u = tn();
    a = u.promise;
    try {
      Promise.resolve(e()).then(u.resolve, (h) => {
        h !== Dt && u.reject(h);
      }).finally(Jt);
    } catch (h) {
      u.reject(h), Jt();
    }
    var c = (
      /** @type {Batch} */
      M
    );
    if (s) {
      if ((o.f & bt) !== 0)
        var v = pn();
      if (
        // boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
        n.b?.is_rendered()
      )
        c.async_deriveds.get(o)?.reject(At);
      else
        for (const h of l.values())
          h.reject(At);
      l.add(u), c.async_deriveds.set(o, u);
    }
    const _ = (h, p = void 0) => {
      v?.(), l.delete(u), p !== At && (c.activate(), p ? (i.f |= Ge, mt(i, p)) : ((i.f & Ge) !== 0 && (i.f ^= Ge), mt(i, h)), c.deactivate());
    };
    u.promise.then(_, (h) => _(null, h || "unknown"));
  }), zn(() => {
    for (const o of l)
      o.reject(At);
  }), new Promise((o) => {
    function u(c) {
      function v() {
        c === a ? o(i) : u(a);
      }
      c.then(v, v);
    }
    u(a);
  });
}
// @__NO_SIDE_EFFECTS__
function ye(e) {
  const t = /* @__PURE__ */ Lt(e);
  return jn(t), t;
}
// @__NO_SIDE_EFFECTS__
function gn(e) {
  const t = /* @__PURE__ */ Lt(e);
  return t.equals = un, t;
}
function Pa(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var r = 0; r < t.length; r += 1)
      ce(
        /** @type {Effect} */
        t[r]
      );
  }
}
function Ar(e) {
  var t, r = T, n = e.parent;
  if (!Pe && n !== null && e.v !== Y && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
  (n.f & (ee | se)) !== 0)
    return ma(), e.v;
  Oe(n);
  try {
    Pa(e), t = Vn(e);
  } finally {
    Oe(r);
  }
  return t;
}
function mn(e) {
  var t = Ar(e);
  if (!e.equals(t) && (e.wv = Pn(), (!M?.is_fork || e.deps === null) && (M !== null ? (M.capture(e, t, !0), ht?.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    F(e, G);
    return;
  }
  Pe || (Me !== null ? (qr() || M?.is_fork) && Me.set(e, t) : Sr(e));
}
function Fa(e) {
  if (e.effects !== null)
    for (const t of e.effects)
      (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && Vt(() => {
        t.ac.abort(Dt), t.ac = null;
      }), t.fn !== null && (t.teardown = ra), jt(t, 0), Rr(t));
}
function kn(e) {
  if (e.effects !== null)
    for (const t of e.effects)
      t.teardown && t.fn !== null && kt(t);
}
let sr = null, lt = null, M = null, ht = null, Me = null, gr = null, qt = !1, lr = !1, Rt = null, Wt = null;
var Dr = 0;
let Va = 1;
class Ke {
  id = Va++;
  /** True as soon as `#process` was called */
  started = !1;
  linked = !0;
  /** @type {Batch | null} */
  prev = null;
  /** @type {Batch | null} */
  next = null;
  /** @type {Map<Effect, ReturnType<typeof deferred<any>>>} */
  async_deriveds = /* @__PURE__ */ new Map();
  /**
   * The current values of any signals that are updated in this batch.
   * Tuple format: [value, is_derived] (note: is_derived is false for deriveds, too, if they were overridden via assignment)
   * The keys of this map are identical to `this.previous`
   * @type {Map<Value, [any, boolean]>}
   */
  current = /* @__PURE__ */ new Map();
  /**
   * The values of any signals (sources and deriveds) that are updated in this batch _before_ those updates took place.
   * The keys of this map are identical to `this.current`
   * @type {Map<Value, any>}
   */
  previous = /* @__PURE__ */ new Map();
  /**
   * When the batch is committed (and the DOM is updated), we need to remove old branches
   * and append new ones by calling the functions added inside (if/each/key/etc) blocks
   * @type {Set<(batch: Batch) => void>}
   */
  #t = /* @__PURE__ */ new Set();
  /**
   * If a fork is discarded, we need to destroy any effects that are no longer needed
   * @type {Set<(batch: Batch) => void>}
   */
  #o = /* @__PURE__ */ new Set();
  /**
   * The number of async effects that are currently in flight
   */
  #e = 0;
  /**
   * Async effects that are currently in flight, _not_ inside a pending boundary
   * @type {Map<Effect, number>}
   */
  #s = /* @__PURE__ */ new Map();
  /**
   * A deferred that resolves when the batch is committed, used with `settled()`
   * TODO replace with Promise.withResolvers once supported widely enough
   * @type {{ promise: Promise<void>, resolve: (value?: any) => void, reject: (reason: unknown) => void } | null}
   */
  #r = null;
  /**
   * Effects that were scheduled in this batch but not yet 'resolved' into the
   * root effects that need to be flushed. Resolving — the upwards traversal that
   * marks the path to each effect on the shared effect tree (see #resolve) — is
   * deferred until the batch is processed, so that the markers are created and
   * consumed within a single traversal. Scheduling into other batches (which can
   * happen concurrently, e.g. while a batch is committed) can therefore never
   * observe (and be confused by) this batch's markers.
   * May contain duplicates — deduplication happens during resolving
   * @type {Effect[]}
   */
  #n = [];
  /**
   * Effects created while this batch was active.
   * @type {Effect[]}
   */
  #i = [];
  /**
   * Deferred effects (which run after async work has completed) and their status (DIRTY or MAYBE_DIRTY)
   * @type {Map<Effect, number>}
   */
  #a = /* @__PURE__ */ new Map();
  /**
   * A map of branches that still exist, but will be destroyed when this batch
   * is committed — we skip over these during `process`.
   * The value contains child effects that were dirty/maybe_dirty before being reset,
   * so they can be rescheduled if the branch survives.
   * @type {Map<Effect, { d: Effect[], m: Effect[] }>}
   */
  #l = /* @__PURE__ */ new Map();
  /**
   * Inverse of #skipped_branches which we need to tell prior batches to unskip them when committing
   * @type {Set<Effect>}
   */
  #h = /* @__PURE__ */ new Set();
  is_fork = !1;
  #f = !1;
  constructor() {
    lt === null ? sr = lt = this : (lt.next = this, this.prev = lt), lt = this;
  }
  #d() {
    if (this.is_fork) return !0;
    for (const t of this.#s.keys())
      if (!this.#g(t))
        return !0;
    return !1;
  }
  /**
   * Whether `effect` is inside a branch that this batch skips
   * @param {Effect} effect
   */
  #g(t) {
    for (var r = (
      /** @type {Effect | null} */
      t
    ); r !== null; r = r.parent)
      if (this.#l.has(r)) return !0;
    return !1;
  }
  /**
   * Add an effect to the #skipped_branches map and reset its children
   * @param {Effect} effect
   */
  skip_effect(t) {
    this.#l.has(t) || this.#l.set(t, { d: [], m: [] }), this.#h.delete(t);
  }
  /**
   * Remove an effect from the #skipped_branches map and reschedule
   * any tracked dirty/maybe_dirty child effects
   * @param {Effect} effect
   * @param {(e: Effect) => void} callback
   */
  unskip_effect(t, r = (n) => this.schedule(n)) {
    var n = this.#l.get(t);
    if (n) {
      this.#l.delete(t);
      for (var a of n.d)
        F(a, N), r(a);
      for (a of n.m)
        F(a, he), r(a);
    }
    this.#h.add(t);
  }
  /**
   * Convert the effects that were scheduled in this batch into the root effects
   * that need to be traversed, marking the path to each effect (by clearing the
   * `CLEAN` flag on ancestor branches) so that the traversal can find them.
   * This happens right before traversal rather than at scheduling time, so that
   * the markers left on the (shared) effect tree are created and consumed within
   * a single traversal — scheduling into other batches can never observe them
   * @returns {Effect[]}
   */
  #u() {
    var t = [];
    for (const i of this.#n)
      if (!((i.f & ee) !== 0 || (i.f & (N | he)) === 0)) {
        for (var r = i, n = !1; r.parent !== null; ) {
          r = r.parent;
          var a = r.f;
          if ((a & (We | xe)) !== 0) {
            if ((a & G) === 0) {
              n = !0;
              break;
            }
            r.f ^= G;
          }
        }
        n || t.push(r);
      }
    return this.#n = [], t;
  }
  #_() {
    this.started = !0;
    for (const [l, o] of this.#a)
      F(l, o), this.schedule(l);
    this.apply();
    for (var t = Rt = [], r = [], n = Wt = []; this.#n.length > 0; ) {
      Dr++ > 1e3 && (this.#v(), Ba());
      for (const l of this.#u())
        try {
          this.#k(l, t, r);
        } catch (o) {
          throw bn(l), this.#d() || this.discard(), o;
        }
    }
    if (M = null, n.length > 0) {
      var a = Ke.ensure();
      for (const l of n)
        a.schedule(l);
    }
    if (Rt = null, Wt = null, this.#d()) {
      this.#p(r), this.#p(t);
      for (const [l, o] of this.#l)
        yn(l, o);
      n.length > 0 && /** @type {unknown} */
      M.#_();
      return;
    }
    const i = this.#b();
    if (i) {
      this.#p(r), this.#p(t), i.#c(this);
      return;
    }
    this.#a.clear();
    for (const l of this.#t) l(this);
    this.#t.clear(), ht = this, Pr(r), Pr(t), ht = null, this.#r?.resolve();
    var s = (
      /** @type {Batch | null} */
      /** @type {unknown} */
      M
    );
    this.#e === 0 && (this.#n.length === 0 || s !== null) && this.#v(), s !== null && (Re.clear(), s.#_());
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #k(t, r, n) {
    t.f ^= G;
    for (var a = t.first; a !== null; ) {
      var i = a.f, s = (i & (xe | We)) !== 0, l = s && (i & G) !== 0, o = l || (i & se) !== 0 || this.#l.has(a);
      if (!o && a.fn !== null) {
        s ? a.f ^= G : (i & _t) !== 0 ? r.push(a) : Bt(a) && ((i & be) !== 0 && this.add_dirty_reaction(a, he), kt(a));
        var u = a.first;
        if (u !== null) {
          a = u;
          continue;
        }
      }
      for (; a !== null; ) {
        var c = a.next;
        if (c !== null) {
          a = c;
          break;
        }
        a = a.parent;
      }
    }
  }
  #b() {
    for (var t = this.prev; t !== null; t = t.prev)
      if (!t.is_fork && this.#m(t)) return t;
    return null;
  }
  /** @param {Batch} batch */
  #m(t) {
    for (const [r, [, n]] of this.current)
      if (!n && t.current.has(r))
        return !0;
    return !1;
  }
  /**
   * @param {Batch} batch
   */
  #c(t) {
    for (const [n, a] of t.current)
      !this.previous.has(n) && t.previous.has(n) && this.previous.set(n, t.previous.get(n)), this.current.set(n, a);
    for (const [n, a] of t.async_deriveds) {
      const i = this.async_deriveds.get(n);
      i && a.promise.then(i.resolve).catch(i.reject);
    }
    t.async_deriveds.clear(), this.transfer_reactions(t.#a);
    const r = (n) => {
      var a = n.reactions;
      if (a !== null && !((n.f & re) !== 0 && (n.f & (N | he)) === 0))
        for (const l of a) {
          var i = l.f;
          if ((i & re) !== 0)
            r(
              /** @type {Derived} */
              l
            );
          else {
            var s = (
              /** @type {Effect} */
              l
            );
            i & (ct | be) && !this.async_deriveds.has(s) && (this.#a.delete(s), F(s, N), this.schedule(s));
          }
        }
    };
    for (const n of this.current.keys())
      r(n);
    this.oncommit(() => t.discard()), t.#v(), M = this, this.#_();
  }
  /**
   * @param {Effect[]} effects
   */
  #p(t) {
    for (var r = 0; r < t.length; r += 1)
      dn(t[r], this.#a);
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Value} source
   * @param {any} value
   * @param {boolean} [is_derived]
   */
  capture(t, r, n = !1) {
    t.v !== Y && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & Ge) === 0 && (this.current.set(t, [r, n]), Me?.set(t, r)), this.is_fork || (t.v = r);
  }
  activate() {
    M = this;
  }
  deactivate() {
    M = null, Me = null;
  }
  flush() {
    try {
      lr = !0, M = this, this.#_();
    } finally {
      Dr = 0, gr = null, Rt = null, Wt = null, lr = !1, M = null, Me = null, Re.clear();
    }
  }
  discard() {
    for (const t of this.#o) t(this);
    this.#o.clear();
    for (const t of this.async_deriveds.values())
      t.reject(At);
    this.#v(), this.#r?.resolve();
  }
  /**
   * @param {Effect} effect
   */
  register_created_effect(t) {
    this.#i.push(t);
  }
  #w() {
    for (let v = sr; v !== null; v = v.next) {
      var t = v.id < this.id, r = [];
      for (const [_, [h, p]] of this.current) {
        if (v.current.has(_)) {
          var n = (
            /** @type {[any, boolean]} */
            v.current.get(_)[0]
          );
          if (t && h !== n)
            v.current.set(_, [h, p]);
          else
            continue;
        }
        r.push(_);
      }
      if (t)
        for (const [_, h] of this.async_deriveds) {
          const p = v.async_deriveds.get(_);
          p && h.promise.then(p.resolve).catch(p.reject);
        }
      var a = [...v.current.keys()].filter(
        (_) => !/** @type {[any, boolean]} */
        v.current.get(_)[1]
      );
      if (!(!v.started || a.length === 0)) {
        var i = a.filter((_) => !this.current.has(_));
        if (i.length === 0)
          t && v.discard();
        else if (r.length > 0) {
          if (t)
            for (const _ of this.#h)
              v.unskip_effect(_, (h) => {
                (h.f & (be | ct)) !== 0 ? v.schedule(h) : v.#p([h]);
              });
          v.activate();
          var s = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Map();
          for (var o of r)
            wn(o, i, s, l);
          l = /* @__PURE__ */ new Map();
          var u = [...v.current].filter(([_, h]) => {
            const p = this.current.get(_);
            return p ? p[0] !== h[0] || p[1] !== h[1] : !0;
          }).map(([_]) => _);
          if (u.length > 0)
            for (const _ of this.#i)
              (_.f & (ee | se | Zt)) === 0 && Tr(_, u, l) && ((_.f & (ct | be)) !== 0 ? (F(_, N), v.schedule(_)) : v.add_dirty_reaction(_, N));
          if (v.#n.length > 0 && !v.#f) {
            v.apply();
            for (var c of v.#u())
              v.#k(c, [], []);
          }
          v.deactivate();
        }
      }
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  increment(t, r) {
    if (this.#e += 1, t) {
      let n = this.#s.get(r) ?? 0;
      this.#s.set(r, n + 1);
    }
  }
  /**
   * @param {boolean} blocking
   * @param {Effect} effect
   */
  decrement(t, r) {
    if (this.#e -= 1, t) {
      let n = this.#s.get(r) ?? 0;
      n === 1 ? this.#s.delete(r) : this.#s.set(r, n - 1);
    }
    this.#f || (this.#f = !0, Ye(() => {
      this.#f = !1, this.linked && this.flush();
    }));
  }
  /**
   * @param {Map<Effect, number>} dirty_reactions
   */
  transfer_reactions(t) {
    for (const [r, n] of t)
      this.add_dirty_reaction(r, n);
    t.clear();
  }
  /**
   * @param {Effect} effect
   * @param {number} status
   */
  add_dirty_reaction(t, r) {
    (r === N || this.#a.get(t) !== N) && this.#a.set(t, r);
  }
  /** @param {(batch: Batch) => void} fn */
  oncommit(t) {
    this.#t.add(t);
  }
  /** @param {(batch: Batch) => void} fn */
  ondiscard(t) {
    this.#o.add(t);
  }
  settled() {
    return (this.#r ??= tn()).promise;
  }
  static ensure() {
    if (M === null) {
      const t = M = new Ke();
      !lr && !qt && Ye(() => {
        t.started || t.flush();
      });
    }
    return M;
  }
  apply() {
    {
      Me = null;
      return;
    }
  }
  /**
   *
   * @param {Effect} effect
   */
  schedule(t) {
    if (gr = t, t.b?.is_pending && (t.f & (_t | nr | rn)) !== 0 && (t.f & bt) === 0) {
      t.b.defer_effect(t);
      return;
    }
    this.#n.push(t);
  }
  #v() {
    if (this.linked) {
      var t = this.prev, r = this.next;
      t === null ? sr = r : t.next = r, r === null ? lt = t : r.prev = t, this.linked = !1;
    }
  }
}
function Ha(e) {
  var t = qt, r = ht;
  ht = null, qt = !0;
  try {
    for (var n; ; ) {
      if (Na(), M === null)
        return (
          /** @type {T} */
          n
        );
      M.flush();
    }
  } finally {
    qt = t, ht = r;
  }
}
function Ba() {
  try {
    Sa();
  } catch (e) {
    ze(e, gr);
  }
}
let Le = null;
function Pr(e) {
  var t = e.length;
  if (t !== 0) {
    for (var r = 0; r < t; ) {
      var n = e[r++];
      if ((n.f & (ee | se)) === 0 && Bt(n) && (Le = /* @__PURE__ */ new Set(), kt(n), n.deps === null && n.first === null && n.nodes === null && n.teardown === null && n.ac === null && On(n), Le?.size > 0)) {
        Re.clear();
        for (const a of Le) {
          if ((a.f & (ee | se)) !== 0) continue;
          const i = [a];
          let s = a.parent;
          for (; s !== null; )
            Le.has(s) && (Le.delete(s), i.push(s)), s = s.parent;
          for (let l = i.length - 1; l >= 0; l--) {
            const o = i[l];
            (o.f & (ee | se)) === 0 && kt(o);
          }
        }
        Le.clear();
      }
    }
    Le = null;
  }
}
function wn(e, t, r, n) {
  if (!r.has(e) && (r.add(e), e.reactions !== null))
    for (const a of e.reactions) {
      const i = a.f;
      (i & re) !== 0 ? wn(
        /** @type {Derived} */
        a,
        t,
        r,
        n
      ) : (i & (ct | be)) !== 0 && (i & N) === 0 && Tr(a, t, n) && (F(a, N), zr(
        /** @type {Effect} */
        a
      ));
    }
}
function Tr(e, t, r) {
  const n = r.get(e);
  if (n !== void 0) return n;
  if (e.deps !== null)
    for (const a of e.deps) {
      if (It.call(t, a))
        return !0;
      if ((a.f & re) !== 0 && Tr(
        /** @type {Derived} */
        a,
        t,
        r
      ))
        return r.set(
          /** @type {Derived} */
          a,
          !0
        ), !0;
    }
  return r.set(e, !1), !1;
}
function zr(e) {
  M.schedule(e);
}
function yn(e, t) {
  if (!((e.f & xe) !== 0 && (e.f & G) !== 0)) {
    (e.f & N) !== 0 ? t.d.push(e) : (e.f & he) !== 0 && t.m.push(e), F(e, G);
    for (var r = e.first; r !== null; )
      yn(r, t), r = r.next;
  }
}
function bn(e) {
  F(e, G);
  for (var t = e.first; t !== null; )
    bn(t), t = t.next;
}
let Qt = /* @__PURE__ */ new Set();
const Re = /* @__PURE__ */ new Map();
let Mn = !1;
function at(e, t) {
  var r = {
    f: 0,
    v: e,
    reactions: null,
    equals: fn,
    rv: 0,
    wv: 0
  };
  return r;
}
// @__NO_SIDE_EFFECTS__
function $(e, t) {
  const r = at(e);
  return jn(r), r;
}
// @__NO_SIDE_EFFECTS__
function Ua(e, t = !1, r = !0) {
  const n = at(e);
  return t || (n.equals = un), n;
}
function V(e, t, r = !1) {
  S !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!Ee || (S.f & Zt) !== 0) && vn() && (S.f & (re | be | ct | Zt)) !== 0 && (Ne === null || !Ne.has(e)) && qa();
  let n = r ? $e(t) : t;
  return mt(e, n, Wt);
}
var Je = null, mr = 0;
function mt(e, t, r = null) {
  if (!e.equals(t)) {
    Pe ? Re.set(e, t) : Re.has(e) || Re.set(e, e.v);
    var n = Ke.ensure();
    if (n.capture(e, t), (e.f & re) !== 0) {
      const a = (
        /** @type {Derived} */
        e
      );
      (e.f & N) !== 0 && Ar(a), Me === null && Sr(a);
    }
    e.wv = Pn(), Je = null, mr = 0, En(e, N, r), Je = null, T !== null && (T.f & G) !== 0 && (T.f & (xe | We)) === 0 && (_e === null ? ai([e]) : _e.push(e)), !n.is_fork && Qt.size > 0 && !Mn && Ya();
  }
  return t;
}
function Ya() {
  Mn = !1;
  for (const e of Qt) {
    (e.f & G) !== 0 && F(e, he);
    let t;
    try {
      t = Bt(e);
    } catch {
      t = !0;
    }
    t && kt(e);
  }
  Qt.clear();
}
function Nt(e) {
  V(e, e.v + 1);
}
function En(e, t, r) {
  var n = e.reactions;
  if (n !== null) {
    var a = n.length;
    if (mr += a, mr > 1e5 && Je === null && (Je = /* @__PURE__ */ new Set()), Je !== null) {
      if (Je.has(e)) return;
      Je.add(e);
    }
    for (var i = 0; i < a; i++) {
      var s = n[i], l = s.f, o = (l & N) === 0;
      if (o && F(s, t), (l & Zt) !== 0)
        Qt.add(
          /** @type {Effect} */
          s
        );
      else if ((l & re) !== 0) {
        var u = (
          /** @type {Derived} */
          s
        );
        Me?.delete(u), En(u, he, r);
      } else if (o) {
        var c = (
          /** @type {Effect} */
          s
        );
        (l & be) !== 0 && Le !== null && Le.add(c), r !== null ? r.push(c) : zr(c);
      }
    }
  }
}
function $e(e) {
  if (typeof e != "object" || e === null || vt in e || nn in e)
    return e;
  const t = en(e);
  if (t !== ea && t !== ta)
    return e;
  var r = /* @__PURE__ */ new Map(), n = tr(e), a = /* @__PURE__ */ $(0), i = rt, s = (l) => {
    if (rt === i)
      return l();
    var o = S, u = rt;
    me(null), Br(i);
    var c = l();
    return me(o), Br(u), c;
  };
  return n && r.set("length", /* @__PURE__ */ $(
    /** @type {any[]} */
    e.length
  )), new Proxy(
    /** @type {any} */
    e,
    {
      defineProperty(l, o, u) {
        (!("value" in u) || u.configurable === !1 || u.enumerable === !1 || u.writable === !1) && Ta();
        var c = r.get(o);
        return c === void 0 ? s(() => {
          var v = /* @__PURE__ */ $(u.value);
          return r.set(o, v), v;
        }) : V(c, u.value, !0), !0;
      },
      deleteProperty(l, o) {
        var u = r.get(o);
        if (u === void 0) {
          if (o in l) {
            const c = s(() => /* @__PURE__ */ $(Y));
            r.set(o, c), Nt(a);
          }
        } else
          V(u, Y), Nt(a);
        return !0;
      },
      get(l, o, u) {
        if (o === vt)
          return e;
        var c = r.get(o), v = o in l;
        if (c === void 0 && (!v || ut(l, o)?.writable) && (c = s(() => {
          var h = $e(v ? l[o] : Y), p = /* @__PURE__ */ $(h);
          return p;
        }), r.set(o, c)), c !== void 0) {
          var _ = g(c);
          return _ === Y ? void 0 : _;
        }
        return Reflect.get(l, o, u);
      },
      getOwnPropertyDescriptor(l, o) {
        this.has?.(l, o);
        var u = Reflect.getOwnPropertyDescriptor(l, o), c = r.get(o);
        if (c !== void 0) {
          var v = g(c);
          if (v === Y)
            return;
          if (u && "value" in u)
            u.value = v;
          else
            return {
              enumerable: !0,
              configurable: !0,
              value: v,
              writable: !0
            };
        }
        return u;
      },
      has(l, o) {
        if (o === vt)
          return !0;
        var u = r.get(o), c = u !== void 0 && u.v !== Y || Reflect.has(l, o);
        if (u !== void 0 || (T !== null || S !== null) && (!c || ut(l, o)?.writable)) {
          u === void 0 && (u = s(() => {
            var _ = c ? $e(l[o]) : Y, h = /* @__PURE__ */ $(_);
            return h;
          }), r.set(o, u));
          var v = g(u);
          if (v === Y)
            return !1;
        }
        return c;
      },
      set(l, o, u, c) {
        var v = r.get(o), _ = o in l;
        if (n && o === "length")
          for (var h = u; h < /** @type {Source<number>} */
          v.v; h += 1) {
            var p = r.get(h + "");
            p !== void 0 ? V(p, Y) : h in l && (p = s(() => /* @__PURE__ */ $(Y)), r.set(h + "", p));
          }
        if (v === void 0)
          (!_ || ut(l, o)?.writable) && (v = s(() => /* @__PURE__ */ $(void 0)), V(v, $e(u)), r.set(o, v));
        else {
          _ = v.v !== Y;
          var w = s(() => $e(u));
          V(v, w);
        }
        var m = Reflect.getOwnPropertyDescriptor(l, o);
        if (m?.set && m.set.call(c, u), !_) {
          if (n && typeof o == "string") {
            var y = (
              /** @type {Source<number>} */
              r.get("length")
            ), C = Number(o);
            Number.isInteger(C) && C >= y.v && V(y, C + 1);
          }
          Nt(a);
        }
        return !0;
      },
      ownKeys(l) {
        g(a);
        var o = Reflect.ownKeys(l).filter((v) => {
          var _ = r.get(v);
          return _ === void 0 || _.v !== Y;
        });
        for (var [u, c] of r)
          c.v !== Y && !(u in l) && o.push(u);
        return o;
      },
      setPrototypeOf() {
        za();
      }
    }
  );
}
function Fr(e) {
  try {
    if (e !== null && typeof e == "object" && vt in e)
      return e[vt];
  } catch {
  }
  return e;
}
function Cn(e, t) {
  return Object.is(Fr(e), Fr(t));
}
var Vr, xn, Sn, An;
function Ga() {
  if (Vr === void 0) {
    Vr = window, xn = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, r = Text.prototype;
    Sn = ut(t, "firstChild").get, An = ut(t, "nextSibling").get, Lr(e) && (e[dr] = void 0, e[an] = null, e[_r] = void 0, e.__e = void 0), Lr(r) && (r[pr] = void 0);
  }
}
function De(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function Te(e) {
  return (
    /** @type {TemplateNode | null} */
    Sn.call(e)
  );
}
// @__NO_SIDE_EFFECTS__
function Ht(e) {
  return (
    /** @type {TemplateNode | null} */
    An.call(e)
  );
}
function z(e, t) {
  return /* @__PURE__ */ Te(e);
}
function Ue(e, t = !1) {
  {
    var r = /* @__PURE__ */ Te(e);
    return r instanceof Comment && r.data === "" ? /* @__PURE__ */ Ht(r) : r;
  }
}
function X(e, t = !1) {
  return /* @__PURE__ */ Te(e);
}
function E(e, t = 1, r = !1) {
  let n = e;
  for (; t--; )
    n = /** @type {TemplateNode} */
    /* @__PURE__ */ Ht(n);
  return n;
}
function Wa(e) {
  e.textContent = "";
}
function Tn() {
  return !1;
}
function Ka(e, t, r) {
  return (
    /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
    r ? document.createElement(e, { is: r }) : document.createElement(e)
  );
}
function Za(e) {
  var t = T;
  if (t === null)
    return S.f |= Ge, e;
  if ((t.f & bt) === 0 && (t.f & _t) === 0)
    throw e;
  ze(e, t);
}
function ze(e, t) {
  if (e === on)
    throw e;
  if (!(t !== null && (t.f & ee) !== 0)) {
    for (; t !== null; ) {
      if ((t.f & hr) !== 0 && (t.f & (ee | Kt)) === 0) {
        if ((t.f & bt) === 0)
          throw e;
        try {
          t.b.error(e);
          return;
        } catch (r) {
          e = r;
        }
      }
      t = t.parent;
    }
    throw e;
  }
}
function Xa(e) {
  T === null && (S === null && xa(), Ca()), Pe && Ea();
}
function Ja(e, t) {
  var r = t.last;
  r === null ? t.last = t.first = e : (r.next = e, e.prev = r, t.last = e);
}
function Fe(e, t) {
  var r = T;
  r !== null && (r.f & se) !== 0 && (e |= se);
  var n = {
    ctx: ue,
    deps: null,
    nodes: null,
    f: e | N | Ce,
    first: null,
    fn: t,
    last: null,
    next: null,
    parent: r,
    b: r && r.b,
    prev: null,
    teardown: null,
    wv: 0,
    ac: null
  };
  M?.register_created_effect(n);
  var a = n;
  if ((e & _t) !== 0)
    Rt !== null ? Rt.push(n) : Ke.ensure().schedule(n);
  else if (t !== null) {
    try {
      kt(n);
    } catch (s) {
      throw ce(n), s;
    }
    a.deps === null && a.teardown === null && a.nodes === null && a.first === a.last && // either `null`, or a singular child
    (a.f & Mt) === 0 && (a = a.first, (e & be) !== 0 && (e & pt) !== 0 && a !== null && (a.f |= pt));
  }
  if (a !== null && (a.parent = r, r !== null && Ja(a, r), S !== null && (S.f & re) !== 0 && (e & We) === 0)) {
    var i = (
      /** @type {Derived} */
      S
    );
    (i.effects ??= []).push(a);
  }
  return n;
}
function qr() {
  return S !== null && !Ee;
}
function zn(e) {
  const t = Fe(nr, null);
  return F(t, G), t.teardown = e, t;
}
function Qa(e) {
  Xa();
  var t = (
    /** @type {Effect} */
    T.f
  ), r = !S && (t & xe) !== 0 && ue !== null && !ue.i;
  if (r) {
    var n = (
      /** @type {ComponentContext} */
      ue
    );
    (n.e ??= []).push(e);
  } else
    return qn(e);
}
function qn(e) {
  return Fe(_t | ia, e);
}
function $a(e) {
  Ke.ensure();
  const t = Fe(We | Mt, e);
  return (r = {}) => new Promise((n) => {
    r.outro ? tt(t, () => {
      ce(t), n(void 0);
    }) : (ce(t), n(void 0));
  });
}
function ei(e) {
  return Fe(_t, e);
}
function ti(e) {
  return Fe(ct | Mt, e);
}
function Rn(e, t = 0) {
  return Fe(nr | t, e);
}
function H(e, t = [], r = [], n = []) {
  La(n, t, r, (a) => {
    Fe(nr, () => {
      e(...a.map(g));
    });
  });
}
function ar(e, t = 0) {
  var r = Fe(be | t, e);
  return r;
}
function pe(e) {
  return Fe(xe | Mt, e);
}
function Nn(e) {
  var t = e.teardown;
  if (t !== null) {
    const r = Pe, n = S;
    Hr(!0), me(null);
    try {
      t.call(null);
    } catch (a) {
      ze(a, e.parent);
    } finally {
      Hr(r), me(n);
    }
  }
}
function Rr(e, t = !1) {
  var r = e.first;
  for (e.first = e.last = null; r !== null; ) {
    const a = r.ac;
    a !== null && Vt(() => {
      a.abort(Dt);
    });
    var n = r.next;
    (r.f & We) !== 0 ? r.parent = null : ce(r, t), r = n;
  }
}
function ri(e) {
  for (var t = e.first; t !== null; ) {
    var r = t.next;
    (t.f & xe) === 0 && ce(t), t = r;
  }
}
function ce(e, t = !0) {
  var r = !1;
  (t || (e.f & aa) !== 0) && e.nodes !== null && e.nodes.end !== null && (ni(
    e.nodes.start,
    /** @type {TemplateNode} */
    e.nodes.end
  ), r = !0), e.f |= Kt, Rr(e, t && !r), jt(e, 0);
  var n = e.nodes && e.nodes.t;
  if (n !== null)
    for (const i of n)
      i.stop();
  Nn(e), e.f ^= Kt, e.f |= ee;
  var a = e.parent;
  a !== null && a.first !== null && On(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function ni(e, t) {
  for (; e !== null; ) {
    var r = e === t ? null : /* @__PURE__ */ Ht(e);
    e.remove(), e = r;
  }
}
function On(e) {
  var t = e.parent, r = e.prev, n = e.next;
  r !== null && (r.next = n), n !== null && (n.prev = r), t !== null && (t.first === e && (t.first = n), t.last === e && (t.last = r));
}
function tt(e, t, r = !0) {
  var n = [];
  e.f |= xr, In(e, n, !0);
  var a = () => {
    r && ce(e), t && t();
  }, i = n.length;
  if (i > 0) {
    var s = () => --i || a();
    for (var l of n)
      l.out(s);
  } else
    a();
}
function In(e, t, r) {
  if ((e.f & se) === 0) {
    e.f ^= se;
    var n = e.nodes && e.nodes.t;
    if (n !== null)
      for (const l of n)
        (l.is_global || r) && t.push(l);
    for (var a = e.first; a !== null; ) {
      var i = a.next;
      if ((a.f & We) === 0) {
        var s = (a.f & pt) !== 0 || // If this is a branch effect without a block effect parent,
        // it means the parent block effect was pruned. In that case,
        // transparency information was transferred to the branch effect.
        (a.f & xe) !== 0 && (e.f & be) !== 0;
        In(a, t, s ? r : !1);
      }
      a = i;
    }
  }
}
function $t(e) {
  e.f &= ~xr, Ln(e, !0);
}
function Ln(e, t) {
  if ((e.f & xr) === 0 && (e.f & se) !== 0) {
    e.f ^= se, (e.f & G) === 0 && (F(e, N), Ke.ensure().schedule(e));
    for (var r = e.first; r !== null; ) {
      var n = r.next, a = (r.f & pt) !== 0 || (r.f & xe) !== 0;
      Ln(r, a ? t : !1), r = n;
    }
    var i = e.nodes && e.nodes.t;
    if (i !== null)
      for (const s of i)
        (s.is_global || t) && s.in();
  }
}
function Nr(e, t) {
  if (e.nodes)
    for (var r = e.nodes.start, n = e.nodes.end; r !== null; ) {
      var a = r === n ? null : /* @__PURE__ */ Ht(r);
      t.append(r), r = a;
    }
}
let Pe = !1;
function Hr(e) {
  Pe = e;
}
let S = null, Ee = !1;
function me(e) {
  S = e;
}
let T = null;
function Oe(e) {
  T = e;
}
let Ne = null;
function jn(e) {
  S !== null && ((S.f & Xt) !== 0 || (S.f & re) !== 0) && (Ne ??= /* @__PURE__ */ new Set()).add(e);
}
let fe = null, ve = 0, _e = null;
function ai(e) {
  _e = e;
}
let Dn = 1, et = 0, rt = et;
function Br(e) {
  rt = e;
}
function Pn() {
  return ++Dn;
}
function Bt(e) {
  var t = e.f;
  if ((t & N) !== 0)
    return !0;
  if ((t & he) !== 0) {
    for (var r = (
      /** @type {Value[]} */
      e.deps
    ), n = r.length, a = 0; a < n; a++) {
      var i = r[a];
      if (Bt(
        /** @type {Derived} */
        i
      ) && mn(
        /** @type {Derived} */
        i
      ), i.wv > e.wv)
        return !0;
    }
    (t & Ce) !== 0 && // During time traveling we don't want to reset the status so that
    // traversal of the graph in the other batches still happens
    Me === null && F(e, G);
  }
  return !1;
}
function Fn(e, t, r = !0) {
  var n = e.reactions;
  if (n !== null && !(Ne !== null && Ne.has(e)))
    for (var a = 0; a < n.length; a++) {
      var i = n[a];
      (i.f & re) !== 0 ? Fn(
        /** @type {Derived} */
        i,
        t,
        !1
      ) : t === i && (r ? F(i, N) : (i.f & G) !== 0 && F(i, he), zr(
        /** @type {Effect} */
        i
      ));
    }
}
function Vn(e) {
  var t = fe, r = ve, n = _e, a = S, i = Ne, s = ue, l = Ee, o = rt, u = e.f;
  fe = /** @type {null | Value[]} */
  null, ve = 0, _e = null, S = (u & (xe | We)) === 0 ? e : null, Ne = null, gt(e.ctx), Ee = !1, rt = ++et, e.ac !== null && (Vt(() => {
    e.ac.abort(Dt);
  }), e.ac = null);
  try {
    e.f |= Xt;
    var c = (
      /** @type {Function} */
      e.fn
    ), v = c();
    e.f |= bt;
    var _ = Ur(e);
    if (vn() && _e !== null && !Ee && _ !== null && (e.f & (re | he | N)) === 0)
      for (var h = 0; h < /** @type {Source[]} */
      _e.length; h++)
        Fn(
          _e[h],
          /** @type {Effect} */
          e
        );
    if (a !== null && a !== e) {
      if (et++, a.deps !== null)
        for (let p = 0; p < r; p += 1)
          a.deps[p].rv = et;
      if (t !== null)
        for (const p of t)
          p.rv = et;
      _e !== null && (n === null ? n = _e : n.push(.../** @type {Source[]} */
      _e));
    }
    return (e.f & Ge) !== 0 && (e.f ^= Ge), v;
  } catch (p) {
    return Ur(e), Za(p);
  } finally {
    e.f ^= Xt, fe = t, ve = r, _e = n, S = a, Ne = i, gt(s), Ee = l, rt = o;
  }
}
function Ur(e) {
  var t = e.deps, r = M?.is_fork;
  if (fe !== null) {
    var n;
    if (r || jt(e, ve), t !== null && ve > 0)
      for (t.length = ve + fe.length, n = 0; n < fe.length; n++)
        t[ve + n] = fe[n];
    else
      e.deps = t = fe;
    if (qr() && (e.f & Ce) !== 0)
      for (n = ve; n < t.length; n++)
        (t[n].reactions ??= []).push(e);
  } else !r && t !== null && ve < t.length && (jt(e, ve), t.length = ve);
  return t;
}
function ii(e, t) {
  let r = t.reactions;
  if (r !== null) {
    var n = Qn.call(r, e);
    if (n !== -1) {
      var a = r.length - 1;
      a === 0 ? r = t.reactions = null : (r[n] = r[a], r.pop());
    }
  }
  if (r === null && (t.f & re) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (fe === null || !It.call(fe, t))) {
    var i = (
      /** @type {Derived} */
      t
    );
    (i.f & Ce) !== 0 && (i.f ^= Ce), i.v !== Y && Sr(i), i.ac !== null && Vt(() => {
      i.ac.abort(Dt), i.ac = null, F(i, N);
    }), Fa(i), jt(i, 0);
  }
}
function jt(e, t) {
  var r = e.deps;
  if (r !== null)
    for (var n = t; n < r.length; n++)
      ii(e, r[n]);
}
function kt(e) {
  var t = e.f;
  if ((t & ee) === 0) {
    F(e, G);
    var r = T;
    T = e;
    try {
      (t & (be | rn)) !== 0 ? ri(e) : Rr(e), Nn(e);
      var n = Vn(e);
      e.teardown = typeof n == "function" ? n : null, e.wv = Dn;
      var a;
    } finally {
      T = r;
    }
  }
}
async function si() {
  await Promise.resolve(), Ha();
}
function g(e) {
  var t = e.f, r = (t & re) !== 0;
  if (S !== null && !Ee) {
    var n = T !== null && (T.f & ee) !== 0;
    if (!n && (Ne === null || !Ne.has(e))) {
      var a = S.deps;
      if ((S.f & Xt) !== 0)
        e.rv < et && (e.rv = et, fe === null && a !== null && a[ve] === e ? ve++ : fe === null ? fe = [e] : fe.push(e));
      else {
        S.deps ??= [], It.call(S.deps, e) || S.deps.push(e);
        var i = e.reactions;
        i === null ? e.reactions = [S] : It.call(i, S) || i.push(S);
      }
    }
  }
  if (Pe && Re.has(e))
    return Re.get(e);
  if (r) {
    var s = (
      /** @type {Derived} */
      e
    );
    if (Pe) {
      var l = s.v;
      return ((s.f & G) === 0 && s.reactions !== null || Bn(s)) && (l = Ar(s)), Re.set(s, l), l;
    }
    var o = (s.f & Ce) === 0 && !Ee && S !== null && (S.f & Ce) !== 0, u = (s.f & bt) === 0;
    Bt(s) && (o && (s.f |= Ce), mn(s)), o && !u && (kn(s), Hn(s));
  }
  if (Me?.has(e))
    return Me.get(e);
  if ((e.f & Ge) !== 0)
    throw e.v;
  return e.v;
}
function Hn(e) {
  if (e.f |= Ce, e.deps !== null)
    for (const r of e.deps) {
      var t = r.reactions;
      t === null ? r.reactions = [e] : It.call(t, e) || t.push(e), (r.f & re) !== 0 && (r.f & Ce) === 0 && (kn(
        /** @type {Derived} */
        r
      ), Hn(
        /** @type {Derived} */
        r
      ));
    }
}
function Bn(e) {
  if (e.v === Y) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (Re.has(t) || (t.f & re) !== 0 && Bn(
      /** @type {Derived} */
      t
    ))
      return !0;
  return !1;
}
function Or(e) {
  var t = Ee;
  try {
    return Ee = !0, e();
  } finally {
    Ee = t;
  }
}
const li = ["touchstart", "touchmove"];
function oi(e) {
  return li.includes(e);
}
const Tt = /* @__PURE__ */ Symbol("events"), Un = /* @__PURE__ */ new Set(), kr = /* @__PURE__ */ new Set();
function je(e, t, r) {
  (t[Tt] ??= {})[e] = r;
}
function Ir(e) {
  for (var t = 0; t < e.length; t++)
    Un.add(e[t]);
  for (var r of kr)
    r(e);
}
let or = null, fr = !1;
function Yr(e) {
  var t = this, r = (
    /** @type {Node} */
    t.ownerDocument
  ), n = e.type, a = e.composedPath?.() || [], i = (
    /** @type {null | Element} */
    a[0] || e.target
  );
  or = e, fr || (fr = !0, setTimeout(() => {
    fr = !1, or = null;
  }));
  var s = 0, l = or === e && e[Tt];
  if (l) {
    var o = a.indexOf(l);
    if (o !== -1 && (t === document || t === /** @type {any} */
    window)) {
      e[Tt] = t;
      return;
    }
    var u = a.indexOf(t);
    if (u === -1)
      return;
    o <= u && (s = o);
  }
  if (i = /** @type {Element} */
  a[s] || e.target, i !== t) {
    $r(e, "currentTarget", {
      configurable: !0,
      get() {
        return i || r;
      }
    });
    var c = S, v = T;
    me(null), Oe(null);
    try {
      for (var _, h = []; i !== null && i !== t; ) {
        try {
          var p = i[Tt]?.[n];
          p != null && (!/** @type {any} */
          i.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          e.target === i) && p.call(i, e);
        } catch (w) {
          _ ? h.push(w) : _ = w;
        }
        if (e.cancelBubble) break;
        s++, i = s < a.length ? (
          /** @type {Element} */
          a[s]
        ) : null;
      }
      if (_) {
        for (let w of h)
          queueMicrotask(() => {
            throw w;
          });
        throw _;
      }
    } finally {
      e[Tt] = t, delete e.currentTarget, me(c), Oe(v);
    }
  }
}
const fi = (
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", {
    /** @param {string} html */
    createHTML: (e) => e
  })
);
function ui(e) {
  return (
    /** @type {string} */
    fi?.createHTML(e) ?? e
  );
}
function Yn(e) {
  var t = Ka("template");
  return t.innerHTML = ui(e.replaceAll("<!>", "<!---->")), t.content;
}
function wt(e, t) {
  var r = (
    /** @type {Effect} */
    T
  );
  r.nodes === null && (r.nodes = { start: e, end: t, a: null, t: null });
}
// @__NO_SIDE_EFFECTS__
function J(e, t) {
  var r = (t & ln) !== 0, n = (t & pa) !== 0, a, i = !e.startsWith("<!>");
  return () => {
    a === void 0 && (a = Yn(i ? e : "<!>" + e), r || (a = /** @type {TemplateNode} */
    /* @__PURE__ */ Te(a)));
    var s = (
      /** @type {TemplateNode} */
      n || xn ? document.importNode(a, !0) : a.cloneNode(!0)
    );
    if (r) {
      var l = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Te(s)
      ), o = (
        /** @type {TemplateNode} */
        s.lastChild
      );
      wt(l, o);
    } else
      wt(s, s);
    return s;
  };
}
// @__NO_SIDE_EFFECTS__
function ci(e, t, r = "svg") {
  var n = !e.startsWith("<!>"), a = (t & ln) !== 0, i = `<${r}>${n ? e : "<!>" + e}</${r}>`, s;
  return () => {
    if (!s) {
      var l = (
        /** @type {DocumentFragment} */
        Yn(i)
      ), o = (
        /** @type {Element} */
        /* @__PURE__ */ Te(l)
      );
      if (a)
        for (s = document.createDocumentFragment(); /* @__PURE__ */ Te(o); )
          s.appendChild(
            /** @type {TemplateNode} */
            /* @__PURE__ */ Te(o)
          );
      else
        s = /** @type {Element} */
        /* @__PURE__ */ Te(o);
    }
    var u = (
      /** @type {TemplateNode} */
      s.cloneNode(!0)
    );
    if (a) {
      var c = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Te(u)
      ), v = (
        /** @type {TemplateNode} */
        u.lastChild
      );
      wt(c, v);
    } else
      wt(u, u);
    return u;
  };
}
// @__NO_SIDE_EFFECTS__
function b(e, t) {
  return /* @__PURE__ */ ci(e, t, "svg");
}
function Gr(e = "") {
  {
    var t = De(e + "");
    return wt(t, t), t;
  }
}
function vi() {
  var e = document.createDocumentFragment(), t = document.createComment(""), r = De();
  return e.append(t, r), wt(t, r), e;
}
function k(e, t) {
  e !== null && e.before(
    /** @type {Node} */
    t
  );
}
function hi() {
  return (window.__svelte ??= {}).uid ??= 1, `c${window.__svelte.uid++}`;
}
function di(e) {
  let t = 0, r = at(0), n;
  return () => {
    qr() && (g(r), Rn(() => (t === 0 && (n = Or(() => e(() => Nt(r)))), t += 1, () => {
      Ye(() => {
        t -= 1, t === 0 && (n?.(), n = void 0, Nt(r));
      });
    })));
  };
}
var _i = pt | Mt;
function pi(e, t, r, n) {
  new gi(e, t, r, n);
}
class gi {
  /** @type {Boundary | null} */
  parent;
  is_pending = !1;
  /**
   * API-level transformError transform function. Transforms errors before they reach the `failed` snippet.
   * Inherited from parent boundary, or defaults to identity.
   * @type {(error: unknown) => unknown}
   */
  transform_error;
  /** @type {TemplateNode} */
  #t;
  /** @type {TemplateNode | null} */
  #o = null;
  /** @type {BoundaryProps} */
  #e;
  /** @type {((anchor: Node) => void)} */
  #s;
  /** @type {Effect} */
  #r;
  /** @type {Effect | null} */
  #n = null;
  /** @type {Effect | null} */
  #i = null;
  /** @type {Effect | null} */
  #a = null;
  /** @type {DocumentFragment | null} */
  #l = null;
  #h = 0;
  #f = 0;
  #d = !1;
  /** @type {Map<Effect, number>} */
  #g = /* @__PURE__ */ new Map();
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #u = null;
  #_ = di(() => (this.#u = at(this.#h), () => {
    this.#u = null;
  }));
  /**
   * @param {TemplateNode} node
   * @param {BoundaryProps} props
   * @param {((anchor: Node) => void)} children
   * @param {((error: unknown) => unknown) | undefined} [transform_error]
   */
  constructor(t, r, n, a) {
    this.#t = t, this.#e = r, this.#s = (i) => {
      var s = (
        /** @type {Effect} */
        T
      );
      s.b = this, s.f |= hr, n(i);
    }, this.parent = /** @type {Effect} */
    T.b, this.transform_error = a ?? this.parent?.transform_error ?? ((i) => i), this.#r = ar(() => {
      this.#w();
    }, _i);
  }
  #k() {
    try {
      this.#n = pe(() => this.#s(this.#t));
    } catch (t) {
      this.error(t);
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #b(t) {
    const r = this.#e.failed, { reset: n, invoke_onerror: a } = this.#m(t);
    Ye(a), r && (this.#a = pe(() => {
      r(
        this.#t,
        () => t,
        () => n
      );
    }));
  }
  /**
   * Creates the `reset` function for a failed boundary, along with a function
   * that invokes `onerror` with it (if provided)
   * @param {unknown} error
   * @returns {{ reset: () => void, invoke_onerror: () => void }}
   */
  #m(t) {
    var r = !1, n = !1;
    const a = () => {
      if (!this.#c()) {
        if (r) {
          wa();
          return;
        }
        r = !0, n && Ra(), this.#a !== null && tt(this.#a, () => {
          this.#a = null;
        }), this.#y(() => {
          this.#w();
        });
      }
    };
    return { reset: a, invoke_onerror: () => {
      if (!this.#c())
        try {
          n = !0, this.#e.onerror?.(t, a), n = !1;
        } catch (s) {
          ze(s, this.#r && this.#r.parent);
        }
    } };
  }
  #c() {
    return (this.#r.f & (ee | Kt)) !== 0;
  }
  #p() {
    const t = this.#e.pending;
    t && (this.is_pending = !0, this.#i = pe(() => t(this.#t)), Ye(() => {
      if (!this.#c()) {
        var r = this.#l = document.createDocumentFragment(), n = De(), a = !1;
        if (r.append(n), this.#n = this.#y(() => {
          try {
            return pe(() => this.#s(n));
          } catch (i) {
            try {
              this.error(i), a = !0;
            } catch (s) {
              ze(s, this.#r.parent);
            }
            return null;
          }
        }), this.#n === null) {
          this.#l = null, a && this.#v(
            /** @type {Batch} */
            M
          );
          return;
        }
        this.#f === 0 && (this.#t.before(r), this.#l = null, tt(
          /** @type {Effect} */
          this.#i,
          () => {
            this.#i = null;
          }
        ), this.#v(
          /** @type {Batch} */
          M
        ));
      }
    }));
  }
  #w() {
    try {
      if (this.is_pending = this.has_pending_snippet(), this.#f = 0, this.#h = 0, this.#n = pe(() => {
        this.#s(this.#t);
      }), this.#f > 0) {
        var t = this.#l = document.createDocumentFragment();
        Nr(this.#n, t);
        const r = (
          /** @type {(anchor: Node) => void} */
          this.#e.pending
        );
        this.#i = pe(() => r(this.#t));
      } else
        this.#v(
          /** @type {Batch} */
          M
        );
    } catch (r) {
      this.error(r);
    }
  }
  /**
   * @param {Batch} batch
   */
  #v(t) {
    this.is_pending = !1, t.transfer_reactions(this.#g);
  }
  /**
   * Defer an effect inside a pending boundary until the boundary resolves
   * @param {Effect} effect
   */
  defer_effect(t) {
    dn(t, this.#g);
  }
  /**
   * Returns `false` if the effect exists inside a boundary whose pending snippet is shown
   * @returns {boolean}
   */
  is_rendered() {
    return !this.is_pending && (!this.parent || this.parent.is_rendered());
  }
  has_pending_snippet() {
    return !!this.#e.pending;
  }
  /**
   * @template T
   * @param {() => T} fn
   */
  #y(t) {
    var r = T, n = S, a = ue;
    Oe(this.#r), me(this.#r), gt(this.#r.ctx);
    try {
      return Ke.ensure(), t();
    } finally {
      Oe(r), me(n), gt(a);
    }
  }
  /**
   * Updates the pending count associated with the currently visible pending snippet,
   * if any, such that we can replace the snippet with content once work is done
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  #M(t, r) {
    if (!this.has_pending_snippet()) {
      this.parent && this.parent.#M(t, r);
      return;
    }
    this.#f += t, this.#f === 0 && (this.#v(r), this.#i && tt(this.#i, () => {
      this.#i = null;
    }), this.#l && (this.#t.before(this.#l), this.#l = null));
  }
  /**
   * Update the source that powers `$effect.pending()` inside this boundary,
   * and controls when the current `pending` snippet (if any) is removed.
   * Do not call from inside the class
   * @param {1 | -1} d
   * @param {Batch} batch
   */
  update_pending_count(t, r) {
    this.#M(t, r), this.#h += t, !(!this.#u || this.#d) && (this.#d = !0, Ye(() => {
      this.#d = !1, this.#u && mt(this.#u, this.#h);
    }));
  }
  get_effect_pending() {
    return this.#_(), g(
      /** @type {Source<number>} */
      this.#u
    );
  }
  /** @param {unknown} error */
  error(t) {
    if (t === on || !this.#e.onerror && !this.#e.failed)
      throw t;
    M?.is_fork ? (this.#n && M.skip_effect(this.#n), this.#i && M.skip_effect(this.#i), this.#a && M.skip_effect(this.#a), M.oncommit(() => {
      this.#c() || this.#E(t);
    })) : this.#E(t);
  }
  /**
   * @param {unknown} error
   */
  #E(t) {
    this.#n && (ce(this.#n), this.#n = null), this.#i && (ce(this.#i), this.#i = null), this.#a && (ce(this.#a), this.#a = null);
    let r = this.#e.failed;
    const n = (a) => {
      if (this.#c()) return;
      const { reset: i, invoke_onerror: s } = this.#m(a);
      s(), r && !this.#c() && (this.#a = this.#y(() => {
        try {
          return pe(() => {
            var l = (
              /** @type {Effect} */
              T
            );
            l.b = this, l.f |= hr, r(
              this.#t,
              () => a,
              () => i
            );
          });
        } catch (l) {
          return ze(
            l,
            /** @type {Effect} */
            this.#r.parent
          ), null;
        }
      }));
    };
    Ye(() => {
      if (!this.#c()) {
        var a;
        try {
          a = this.transform_error(t);
        } catch (i) {
          ze(i, this.#r && this.#r.parent);
          return;
        }
        a !== null && typeof a == "object" && typeof /** @type {any} */
        a.then == "function" ? a.then(
          n,
          /** @param {unknown} e */
          (i) => ze(i, this.#r && this.#r.parent)
        ) : n(a);
      }
    });
  }
}
function j(e, t) {
  var r = t == null ? "" : typeof t == "object" ? `${t}` : t;
  r !== /** @type {any} */
  (e[pr] ??= e.nodeValue) && (e[pr] = r, e.nodeValue = `${r}`);
}
function mi(e, t) {
  return ki(e, t);
}
const Ut = /* @__PURE__ */ new Map();
function ki(e, { target: t, anchor: r, props: n = {}, events: a, context: i, intro: s = !0, transformError: l }) {
  Ga();
  var o = void 0, u = $a(() => {
    var c = r ?? t.appendChild(De());
    pi(
      /** @type {TemplateNode} */
      c,
      {
        pending: () => {
        }
      },
      (h) => {
        Pt({});
        var p = (
          /** @type {ComponentContext} */
          ue
        );
        i && (p.c = i), a && (n.$$events = a), o = e(h, n) || cn(), Ft();
      },
      l
    );
    var v = /* @__PURE__ */ new Set(), _ = (h) => {
      for (var p = 0; p < h.length; p++) {
        var w = h[p];
        if (!v.has(w)) {
          v.add(w);
          var m = oi(w);
          for (const R of [t, document]) {
            var y = Ut.get(R);
            y === void 0 && (y = /* @__PURE__ */ new Map(), Ut.set(R, y));
            var C = y.get(w);
            C === void 0 ? (R.addEventListener(w, Yr, { passive: m }), y.set(w, 1)) : y.set(w, C + 1);
          }
        }
      }
    };
    return _(rr(Un)), kr.add(_), () => {
      for (var h of v)
        for (const m of [t, document]) {
          var p = (
            /** @type {Map<string, number>} */
            Ut.get(m)
          ), w = (
            /** @type {number} */
            p.get(h)
          );
          --w == 0 ? (m.removeEventListener(h, Yr), p.delete(h), p.size === 0 && Ut.delete(m)) : p.set(h, w);
        }
      kr.delete(_), c !== r && c.parentNode?.removeChild(c);
    };
  });
  return wr.set(o, u), o;
}
let wr = /* @__PURE__ */ new WeakMap();
function wi(e, t) {
  const r = wr.get(e);
  return r ? (wr.delete(e), r(t)) : Promise.resolve();
}
class Gn {
  /** @type {TemplateNode} */
  anchor;
  /** @type {Map<Batch, Key>} */
  #t = /* @__PURE__ */ new Map();
  /**
   * Map of keys to effects that are currently rendered in the DOM.
   * These effects are visible and actively part of the document tree.
   * Example:
   * ```
   * {#if condition}
   * 	foo
   * {:else}
   * 	bar
   * {/if}
   * ```
   * Can result in the entries `true->Effect` and `false->Effect`
   * @type {Map<Key, Effect>}
   */
  #o = /* @__PURE__ */ new Map();
  /**
   * Similar to #onscreen with respect to the keys, but contains branches that are not yet
   * in the DOM, because their insertion is deferred.
   * @type {Map<Key, Branch>}
   */
  #e = /* @__PURE__ */ new Map();
  /**
   * Keys of effects that are currently outroing
   * @type {Set<Key>}
   */
  #s = /* @__PURE__ */ new Set();
  /**
   * Whether to pause (i.e. outro) on change, or destroy immediately.
   * This is necessary for `<svelte:element>`
   */
  #r = !0;
  /**
   * @param {TemplateNode} anchor
   * @param {boolean} transition
   */
  constructor(t, r = !0) {
    this.anchor = t, this.#r = r;
  }
  /**
   * @param {Batch} batch
   */
  #n = (t) => {
    if (this.#t.has(t)) {
      var r = (
        /** @type {Key} */
        this.#t.get(t)
      ), n = this.#o.get(r);
      if (n)
        $t(n), this.#s.delete(r);
      else {
        var a = this.#e.get(r);
        a && ($t(a.effect), this.#o.set(r, a.effect), this.#e.delete(r), a.fragment.lastChild.remove(), this.anchor.before(a.fragment), n = a.effect);
      }
      for (const [i, s] of this.#t) {
        if (this.#t.delete(i), i === t)
          break;
        const l = this.#e.get(s);
        l && (ce(l.effect), this.#e.delete(s));
      }
      for (const [i, s] of this.#o) {
        if (i === r || this.#s.has(i)) continue;
        const l = () => {
          if (Array.from(this.#t.values()).includes(i)) {
            var u = document.createDocumentFragment();
            Nr(s, u), u.append(De()), this.#e.set(i, { effect: s, fragment: u });
          } else
            ce(s);
          this.#s.delete(i), this.#o.delete(i);
        };
        this.#r || !n ? (this.#s.add(i), tt(s, l, !1)) : l();
      }
    }
  };
  /**
   * @param {Batch} batch
   */
  #i = (t) => {
    this.#t.delete(t);
    const r = Array.from(this.#t.values());
    for (const [n, a] of this.#e)
      r.includes(n) || (ce(a.effect), this.#e.delete(n));
  };
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(t, r) {
    var n = (
      /** @type {Batch} */
      M
    ), a = Tn();
    if (r && !this.#o.has(t) && !this.#e.has(t))
      if (a) {
        var i = document.createDocumentFragment(), s = De();
        i.append(s), this.#e.set(t, {
          effect: pe(() => r(s)),
          fragment: i
        });
      } else
        this.#o.set(
          t,
          pe(() => r(this.anchor))
        );
    if (this.#t.set(n, t), a) {
      for (const [l, o] of this.#o)
        l === t ? n.unskip_effect(o) : n.skip_effect(o);
      for (const [l, o] of this.#e)
        l === t ? n.unskip_effect(o.effect) : n.skip_effect(o.effect);
      n.oncommit(this.#n), n.ondiscard(this.#i);
    } else
      this.#n(n);
  }
}
function ge(e, t, r = !1) {
  var n = new Gn(e), a = r ? pt : 0;
  function i(s, l) {
    n.ensure(s, l);
  }
  ar(() => {
    var s = !1;
    t((l, o = 0) => {
      s = !0, i(o, l);
    }), s || i(-1, null);
  }, a);
}
const yi = /* @__PURE__ */ Symbol("NaN");
function bi(e, t, r) {
  var n = new Gn(e);
  ar(() => {
    var a = t();
    a !== a && (a = /** @type {any} */
    yi), n.ensure(a, r);
  });
}
function yr(e, t) {
  return t;
}
function Mi(e, t, r) {
  for (var n = [], a = t.length, i, s = t.length, l = 0; l < a; l++) {
    let v = t[l];
    tt(
      v,
      () => {
        if (i) {
          if (i.pending.delete(v), i.done.add(v), i.pending.size === 0) {
            var _ = (
              /** @type {Set<EachOutroGroup>} */
              e.outrogroups
            );
            br(e, rr(i.done)), _.delete(i), _.size === 0 && (e.outrogroups = null);
          }
        } else
          s -= 1;
      },
      !1
    );
  }
  if (s === 0) {
    var o = n.length === 0 && r !== null && e.pending.size === 0;
    if (o) {
      var u = (
        /** @type {Element} */
        r
      ), c = (
        /** @type {Element} */
        u.parentNode
      );
      Wa(c), c.append(u), e.items.clear();
    }
    br(e, t, !o);
  } else
    i = {
      pending: new Set(t),
      done: /* @__PURE__ */ new Set()
    }, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(i);
}
function br(e, t, r = !0) {
  var n;
  if (e.pending.size > 0) {
    n = /* @__PURE__ */ new Set();
    for (const s of e.pending.values())
      for (const l of s)
        n.add(
          /** @type {EachItem} */
          e.items.get(l).e
        );
  }
  for (var a = 0; a < t.length; a++) {
    var i = t[a];
    if (n?.has(i)) {
      i.f |= qe;
      const s = document.createDocumentFragment();
      Nr(i, s);
    } else
      ce(t[a], r);
  }
}
var Wr;
function ot(e, t, r, n, a, i = null) {
  var s = e, l = /* @__PURE__ */ new Map(), o = (t & sn) !== 0;
  if (o) {
    var u = (
      /** @type {Element} */
      e
    );
    s = u.appendChild(De());
  }
  var c = null, v = /* @__PURE__ */ gn(() => {
    var C = r();
    return (
      /** @type {V[]} */
      tr(C) ? C : C == null ? [] : rr(C)
    );
  }), _ = /* @__PURE__ */ new Map(), h = !0;
  function p(C) {
    if ((y.effect.f & ee) === 0) {
      y.pending.delete(C);
      var R = g(v);
      y.fallback = c, Ei(y, R, s, t, n), c !== null && (R.length === 0 ? (c.f & qe) === 0 ? $t(c) : (c.f ^= qe, zt(c, null, s)) : tt(c, () => {
        c = null;
      }));
    }
  }
  function w(C) {
    y.pending.delete(C);
  }
  var m = ar(() => {
    for (var C = (
      /** @type {V[]} */
      g(v)
    ), R = C.length, x = /* @__PURE__ */ new Set(), D = (
      /** @type {Batch} */
      M
    ), ne = Tn(), B = 0; B < R; B += 1) {
      var le = C[B], oe = n(le, B), O = h ? null : l.get(oe);
      O ? (O.v && mt(O.v, le), O.i && mt(O.i, B), ne && D.unskip_effect(O.e)) : (O = Ci(
        l,
        h ? s : Wr ??= De(),
        le,
        oe,
        B,
        a,
        t,
        r
      ), h || (O.e.f |= qe), l.set(oe, O)), x.add(oe);
    }
    if (R === 0 && i && !c && (h ? c = pe(() => i(s)) : (c = pe(() => i(Wr ??= De())), c.f |= qe)), R > x.size && Ma(), !h)
      if (_.set(D, x), ne) {
        for (const [Se, Ie] of l)
          x.has(Se) || D.skip_effect(Ie.e);
        D.oncommit(p), D.ondiscard(w);
      } else
        p(D);
    g(v);
  }), y = { effect: m, items: l, pending: _, outrogroups: null, fallback: c };
  h = !1;
}
function St(e) {
  for (; e !== null && (e.f & xe) === 0; )
    e = e.next;
  return e;
}
function Ei(e, t, r, n, a) {
  var i = (n & ua) !== 0, s = t.length, l = e.items, o = St(e.effect.first), u, c = null, v, _ = [], h = [], p, w, m, y;
  if (i)
    for (y = 0; y < s; y += 1)
      p = t[y], w = a(p, y), m = /** @type {EachItem} */
      l.get(w).e, (m.f & qe) === 0 && (m.nodes?.a?.measure(), (v ??= /* @__PURE__ */ new Set()).add(m));
  for (y = 0; y < s; y += 1) {
    if (p = t[y], w = a(p, y), m = /** @type {EachItem} */
    l.get(w).e, e.outrogroups !== null)
      for (const O of e.outrogroups)
        O.pending.delete(m), O.done.delete(m);
    if ((m.f & se) !== 0 && ($t(m), i && (m.nodes?.a?.unfix(), (v ??= /* @__PURE__ */ new Set()).delete(m))), (m.f & qe) !== 0)
      if (m.f ^= qe, m === o)
        zt(m, null, r);
      else {
        var C = c ? c.next : o;
        m === e.effect.last && (e.effect.last = m.prev), m.prev && (m.prev.next = m.next), m.next && (m.next.prev = m.prev), Be(e, c, m), Be(e, m, C), zt(m, C, r), c = m, _ = [], h = [], o = St(c.next);
        continue;
      }
    if (m !== o) {
      if (u !== void 0 && u.has(m)) {
        if (_.length < h.length) {
          var R = h[0], x;
          c = R.prev;
          var D = _[0], ne = _[_.length - 1];
          for (x = 0; x < _.length; x += 1)
            zt(_[x], R, r);
          for (x = 0; x < h.length; x += 1)
            u.delete(h[x]);
          Be(e, D.prev, ne.next), Be(e, c, D), Be(e, ne, R), o = R, c = ne, y -= 1, _ = [], h = [];
        } else
          u.delete(m), zt(m, o, r), Be(e, m.prev, m.next), Be(e, m, c === null ? e.effect.first : c.next), Be(e, c, m), c = m;
        continue;
      }
      for (_ = [], h = []; o !== null && o !== m; )
        (u ??= /* @__PURE__ */ new Set()).add(o), h.push(o), o = St(o.next);
      if (o === null)
        continue;
    }
    (m.f & qe) === 0 && _.push(m), c = m, o = St(m.next);
  }
  if (e.outrogroups !== null) {
    for (const O of e.outrogroups)
      O.pending.size === 0 && (br(e, rr(O.done)), e.outrogroups?.delete(O));
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (o !== null || u !== void 0) {
    var B = [];
    if (u !== void 0)
      for (m of u)
        (m.f & se) === 0 && B.push(m);
    for (; o !== null; )
      (o.f & se) === 0 && o !== e.fallback && B.push(o), o = St(o.next);
    var le = B.length;
    if (le > 0) {
      var oe = (n & sn) !== 0 && s === 0 ? r : null;
      if (i) {
        for (y = 0; y < le; y += 1)
          B[y].nodes?.a?.measure();
        for (y = 0; y < le; y += 1)
          B[y].nodes?.a?.fix();
      }
      Mi(e, B, oe);
    }
  }
  i && Ye(() => {
    if (v !== void 0)
      for (m of v)
        m.nodes?.a?.apply();
  });
}
function Ci(e, t, r, n, a, i, s, l) {
  var o = (s & oa) !== 0 ? (s & ca) === 0 ? /* @__PURE__ */ Ua(r, !1, !1) : at(r) : null, u = (s & fa) !== 0 ? at(a) : null;
  return {
    v: o,
    i: u,
    e: pe(() => (i(t, o ?? r, u ?? a, l), () => {
      e.delete(n);
    }))
  };
}
function zt(e, t, r) {
  if (e.nodes)
    for (var n = e.nodes.start, a = e.nodes.end, i = t && (t.f & qe) === 0 ? (
      /** @type {EffectNodes} */
      t.nodes.start
    ) : r; n !== null; ) {
      var s = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Ht(n)
      );
      if (i.before(n), n === a)
        return;
      n = s;
    }
}
function Be(e, t, r) {
  t === null ? e.effect.first = r : t.next = r, r === null ? e.effect.last = t : r.prev = t;
}
const Kr = [...` 	
\r\f \v\uFEFF`];
function xi(e, t, r) {
  var n = e == null ? "" : "" + e;
  if (t && (n = n ? n + " " + t : t), r) {
    for (var a of Object.keys(r))
      if (r[a])
        n = n ? n + " " + a : a;
      else if (n.length)
        for (var i = a.length, s = 0; (s = n.indexOf(a, s)) >= 0; ) {
          var l = s + i;
          (s === 0 || Kr.includes(n[s - 1])) && (l === n.length || Kr.includes(n[l])) ? n = (s === 0 ? "" : n.substring(0, s)) + n.substring(l + 1) : s = l;
        }
  }
  return n === "" ? null : n;
}
function Zr(e, t = !1) {
  var r = t ? " !important;" : ";", n = "";
  for (var a of Object.keys(e)) {
    var i = e[a];
    i != null && i !== "" && (n += " " + a + ": " + i + r);
  }
  return n;
}
function Si(e, t) {
  if (t) {
    var r = "", n, a;
    return Array.isArray(t) ? (n = t[0], a = t[1]) : n = t, n && (r += Zr(n)), a && (r += Zr(a, !0)), r = r.trim(), r === "" ? null : r;
  }
  return String(e);
}
function nt(e, t, r, n, a, i) {
  var s = (
    /** @type {any} */
    e[dr]
  );
  if (s !== r || s === void 0) {
    var l = xi(r, n, i);
    l == null ? e.removeAttribute("class") : t ? e.className = l : e.setAttribute("class", l), e[dr] = r;
  } else if (i && a !== i)
    for (var o in i) {
      var u = !!i[o];
      (a == null || u !== !!a[o]) && e.classList.toggle(o, u);
    }
  return i;
}
function ur(e, t = {}, r, n) {
  for (var a in r) {
    var i = r[a];
    t[a] !== i && (r[a] == null ? e.style.removeProperty(a) : e.style.setProperty(a, i, n));
  }
}
function Mr(e, t, r, n) {
  var a = (
    /** @type {any} */
    e[_r]
  );
  if (a !== t) {
    var i = Si(t, n);
    i == null ? e.removeAttribute("style") : e.style.cssText = i, e[_r] = t;
  } else n && (Array.isArray(n) ? (ur(e, r?.[0], n[0]), ur(e, r?.[1], n[1], "important")) : ur(e, r, n));
  return n;
}
function Ai(e, t) {
  t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function Ti(e, t) {
  var r = e.__defaultValue, n = e.multiple, a = n ? r ?? [] : null;
  if (!(n && !tr(a))) {
    e.selectedIndex;
    for (var i of e.options) {
      var s = dt(i);
      Ai(
        i,
        n ? (
          /** @type {any[]} */
          a.includes(s)
        ) : Cn(s, r)
      );
    }
  }
}
function Wn(e, t, r = !1) {
  if (e.multiple) {
    if (t == null)
      return;
    if (!tr(t))
      return ka();
    for (var n of e.options)
      n.selected = t.includes(dt(n));
    return;
  }
  for (n of e.options) {
    var a = dt(n);
    if (Cn(a, t)) {
      n.selected = !0;
      return;
    }
  }
  (!r || t !== void 0) && (e.selectedIndex = -1);
}
function zi(e) {
  var t = new MutationObserver((r) => {
    r.every(Ri) || ("__defaultValue" in e && Ti(e), "__value" in e && Wn(e, e.__value));
  });
  t.observe(e, {
    // Listen to option element changes
    childList: !0,
    subtree: !0,
    // because of <optgroup>
    // Listen to option element value attribute changes
    // (doesn't get notified of select value changes,
    // because that property is not reflected as an attribute)
    attributes: !0,
    attributeFilter: ["value"]
  }), zn(() => {
    t.disconnect();
  });
}
function qi(e, t, r = t) {
  var n = /* @__PURE__ */ new WeakSet(), a = !0;
  _n(e, "change", (i) => {
    var s = i ? "[selected]" : ":checked", l;
    if (e.multiple)
      l = [].map.call(e.querySelectorAll(s), dt);
    else {
      var o = e.querySelector(s) ?? // will fall back to first non-disabled option if no option is selected
      e.querySelector("option:not([disabled])");
      l = o && dt(o);
    }
    r(l), e.__value = l, M !== null && n.add(M);
  }), ei(() => {
    var i = t();
    if (e === document.activeElement) {
      var s = (
        /** @type {Batch} */
        M
      );
      if (n.has(s))
        return;
    }
    if (Wn(e, i, a), a && i === void 0) {
      var l = e.querySelector(":checked");
      l !== null && (i = dt(l), r(i));
    }
    e.__value = i, a = !1;
  });
}
function dt(e) {
  return "__value" in e ? e.__value : e.value;
}
function Ri(e) {
  if (
    /** @type {Element} */
    e.target.closest("selectedcontent") !== null
  )
    return !0;
  if (e.type === "childList") {
    var t = [...e.addedNodes, ...e.removedNodes];
    return t.length > 0 && t.every((r) => r.nodeName === "SELECTEDCONTENT");
  }
  return !1;
}
const Ni = /* @__PURE__ */ Symbol("is custom element"), Oi = /* @__PURE__ */ Symbol("is html");
function Z(e, t, r, n) {
  var a = Ii(e), i = a[t];
  i !== (a[t] = r) && (t === "loading" && (e[la] = r), r == null ? e.removeAttribute(t) : typeof r != "string" && Li(e).has(t) ? e[t] = r : e.setAttribute(t, r));
}
function Ii(e) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    /** @type {any} */
    e[an] ??= {
      [Ni]: e.nodeName.includes("-"),
      [Oi]: e.namespaceURI === ga
    }
  );
}
var Xr = /* @__PURE__ */ new Map();
function Li(e) {
  var t = e.getAttribute("is") || e.nodeName, r = Xr.get(t);
  if (r) return r;
  Xr.set(t, r = /* @__PURE__ */ new Set());
  for (var n, a = e, i = Element.prototype; i !== a; ) {
    n = $n(a);
    for (var s in n)
      n[s].set && // better safe than sorry, we don't want spread attributes to mess with HTML content
      s !== "innerHTML" && s !== "textContent" && s !== "innerText" && r.add(s);
    a = en(a);
  }
  return r;
}
function ji(e, t, r = t) {
  var n = /* @__PURE__ */ new WeakSet();
  _n(e, "input", async (a) => {
    var i = a ? e.defaultValue : e.value;
    if (i = cr(e) ? vr(i) : i, r(i), M !== null && n.add(M), await si(), i !== (i = t())) {
      var s = e.selectionStart, l = e.selectionEnd, o = e.value.length;
      if (e.value = i ?? "", l !== null) {
        var u = e.value.length;
        s === l && l === o && u > o ? (e.selectionStart = u, e.selectionEnd = u) : (e.selectionStart = s, e.selectionEnd = Math.min(l, u));
      }
    }
  }), // If we are hydrating and the value has since changed,
  // then use the updated value from the input instead.
  // If defaultValue is set, then value == defaultValue
  // TODO Svelte 6: remove input.value check and set to empty string?
  Or(t) == null && e.value && (r(cr(e) ? vr(e.value) : e.value), M !== null && n.add(M)), Rn(() => {
    var a = t();
    if (e === document.activeElement) {
      var i = (
        /** @type {Batch} */
        M
      );
      if (n.has(i))
        return;
    }
    cr(e) && a === vr(e.value) || e.type === "date" && !a && !e.value || a !== e.value && (e.value = a ?? "");
  });
}
function cr(e) {
  var t = e.type;
  return t === "number" || t === "range";
}
function vr(e) {
  return e === "" ? null : +e;
}
let Yt = !1;
function Di(e) {
  var t = Yt;
  try {
    return Yt = !1, [e(), Yt];
  } finally {
    Yt = t;
  }
}
function yt(e, t, r, n) {
  var a = !0, i = (r & da) !== 0, s = (r & _a) !== 0, l = (
    /** @type {V} */
    n
  ), o = !0, u = (
    /** @type {Derived<V> | undefined} */
    void 0
  ), c = () => s && a ? (u ??= /* @__PURE__ */ Lt(
    /** @type {() => V} */
    n
  ), g(u)) : (o && (o = !1, l = s ? Or(
    /** @type {() => V} */
    n
  ) : (
    /** @type {V} */
    n
  )), l);
  let v;
  if (i) {
    var _ = vt in e || sa in e;
    v = ut(e, t)?.set ?? (_ && t in e ? (x) => e[t] = x : void 0);
  }
  var h, p = !1;
  i ? [h, p] = Di(() => (
    /** @type {V} */
    e[t]
  )) : h = /** @type {V} */
  e[t], h === void 0 && n !== void 0 && (h = c(), v && (Aa(), v(h)));
  var w;
  if (w = () => {
    var x = (
      /** @type {V} */
      e[t]
    );
    return x === void 0 ? c() : (o = !0, x);
  }, (r & ha) === 0)
    return w;
  if (v) {
    var m = e.$$legacy;
    return (
      /** @type {() => V} */
      (function(x, D) {
        return arguments.length > 0 ? ((!D || m || p) && v(D ? w() : x), x) : w();
      })
    );
  }
  var y = !1, C = ((r & va) !== 0 ? Lt : gn)(() => (y = !1, w()));
  i && g(C);
  var R = (
    /** @type {Effect} */
    T
  );
  return (
    /** @type {() => V} */
    (function(x, D) {
      if (arguments.length > 0) {
        const ne = D ? g(C) : i ? $e(x) : x;
        return V(C, ne), y = !0, l !== void 0 && (l = ne), x;
      }
      return Pe && y || (R.f & ee) !== 0 ? C.v : g(C);
    })
  );
}
const Pi = "5";
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(Pi);
var Fi = /* @__PURE__ */ b('<path d="M6 3.2 10.8 8 6 12.8" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>'), Vi = /* @__PURE__ */ b('<path d="M3.2 6 8 10.8 12.8 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>'), Hi = /* @__PURE__ */ b('<path d="M10 3.2 5.2 8 10 12.8" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></path>'), Bi = /* @__PURE__ */ b('<path d="M1.5 4.2c0-.9.7-1.6 1.6-1.6h3.1l1.5 1.5h5.2c.9 0 1.6.7 1.6 1.6v6.4c0 .9-.7 1.6-1.6 1.6H3.1c-.9 0-1.6-.7-1.6-1.6z" fill="currentColor"></path><path d="M1.5 6.3h13" stroke="rgb(0 0 0 / 0.18)" stroke-width="0.8"></path>', 1), Ui = /* @__PURE__ */ b('<path d="M8 1.6l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path>'), Yi = /* @__PURE__ */ b('<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>'), Gi = /* @__PURE__ */ b('<path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#000" stroke-width="1.7" stroke-linecap="round"></path>'), Wi = /* @__PURE__ */ b('<path d="M4.9 8.3l2.1 2.1 4.1-4.6" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>'), Ki = /* @__PURE__ */ b('<path d="M6.4 5.2v5.6M9.6 5.2v5.6" stroke="#000" stroke-width="1.8" stroke-linecap="round"></path>'), Zi = /* @__PURE__ */ b('<path d="M4.8 8h6.4" stroke="#000" stroke-width="1.8" stroke-linecap="round"></path>'), Xi = /* @__PURE__ */ b('<path d="M8 4.6v6.2M5.4 8.4 8 11l2.6-2.6" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>'), Ji = /* @__PURE__ */ b('<circle cx="8" cy="6.2" r="2.4" fill="#000"></circle><path d="M3.4 12.6c1-1.9 2.7-2.8 4.6-2.8s3.6.9 4.6 2.8" fill="#000"></path>', 1), Qi = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><!></mask><circle cx="8" cy="8" r="7" fill="currentColor"></circle>', 1), $i = /* @__PURE__ */ b('<circle cx="3.5" cy="8" r="1.45" fill="currentColor"></circle><circle cx="8" cy="8" r="1.45" fill="currentColor"></circle><circle cx="12.5" cy="8" r="1.45" fill="currentColor"></circle>', 1), es = /* @__PURE__ */ b('<path d="M2.2 2.2l11.6 11.6" stroke="var(--icon-cut, rgb(20 20 30))" stroke-width="2.6" stroke-linecap="round"></path><path d="M2.2 2.2l11.6 11.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>', 1), ts = /* @__PURE__ */ b('<path d="M8 1.8c-2.4 0-4 1.8-4 4.2v2.7L2.6 10.9c-.3.4 0 .9.5.9h9.8c.5 0 .8-.5.5-.9L12 8.7V6c0-2.4-1.6-4.2-4-4.2z" fill="currentColor"></path><path d="M6.3 12.8a1.8 1.8 0 0 0 3.4 0z" fill="currentColor"></path><!>', 1), rs = /* @__PURE__ */ b('<path d="M12.6 6.2A4.9 4.9 0 0 0 3.6 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><path d="M13.6 3.2v3.6H10z" fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round"></path><path d="M3.4 9.8a4.9 4.9 0 0 0 9 1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><path d="M2.4 12.8V9.2H6z" fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round"></path>', 1), ns = /* @__PURE__ */ b('<path d="M2.5 8h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 1.5v4M6 3.8 8 5.8l2-2M8 14.5v-4M6 12.2l2-2 2 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>', 1), as = /* @__PURE__ */ b('<path d="M2.5 1.8h11M2.5 14.2h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 4.2v7.6M6 6.2l2-2 2 2M6 9.8l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>', 1), is = /* @__PURE__ */ b('<path d="M2.5 2.5l11 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>'), ss = /* @__PURE__ */ b('<g><path d="M5.2 1.6h5.6l-.7 1.3v3.2l2 2.4v1H3.9v-1l2-2.4V2.9z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path><path d="M8 9.5v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path></g><!>', 1), ls = /* @__PURE__ */ b('<circle cx="6.5" cy="5" r="2.6" fill="currentColor"></circle><path d="M1.5 13.5c.6-2.7 2.6-4.2 5-4.2s4.4 1.5 5 4.2z" fill="currentColor"></path><path d="M12.8 2.5v5M10.3 5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>', 1), os = /* @__PURE__ */ b('<path d="M13 6A5.2 5.2 0 0 0 3.4 4.4M3 10a5.2 5.2 0 0 0 9.6 1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path><path d="M14 2.6v3.8h-3.8zM2 13.4V9.6h3.8z" fill="currentColor"></path>', 1), fs = /* @__PURE__ */ b('<path d="M2.5 5h10M10 2.5 12.5 5 10 7.5M13.5 11h-10M6 8.5 3.5 11 6 13.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>'), us = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M4.2 5.8 6.4 8 4.2 10.2M7.8 10.6h4" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></mask><rect x="1.2" y="2.2" width="13.6" height="11.6" rx="2.4" fill="currentColor"></rect>', 1), cs = /* @__PURE__ */ b('<rect x="1.6" y="2.6" width="12.8" height="10.8" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M4.4 6 6.4 8 4.4 10M7.8 10.2h3.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>', 1), vs = /* @__PURE__ */ b('<path d="M7.2 2.2a5.6 5.6 0 1 0 6.6 7.6A5 5 0 0 1 7.2 2.2z" fill="currentColor"></path><path d="M12 1.8l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5zM14.3 5.6l.3.7.7.3-.7.3-.3.7-.3-.7-.7-.3.7-.3z" fill="currentColor"></path>', 1), hs = /* @__PURE__ */ b('<path d="M6.6 3a5.6 5.6 0 1 0 6.6 7.6A5 5 0 0 1 6.6 3z" fill="currentColor"></path><path d="M10 1.6h3.2L10 5h3.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"></path>', 1), ds = /* @__PURE__ */ b('<circle cx="5.6" cy="5.2" r="2.5" fill="currentColor"></circle><path d="M1 13.4c.4-2.6 2.2-4 4.6-4s4.2 1.4 4.6 4z" fill="currentColor"></path><circle cx="11.3" cy="5.6" r="2.1" fill="currentColor"></circle><path d="M10.9 9.4c2.2 0 3.7 1.3 4.1 3.6h-3.6c-.2-1.4-.6-2.6-1.4-3.5z" fill="currentColor"></path>', 1), _s = /* @__PURE__ */ b('<path d="M10.6 1.6a3.3 3.3 0 0 0-3.2 4.2L2.2 11a1.4 1.4 0 0 0 2 2l5.2-5.2a3.3 3.3 0 0 0 4.2-4.2l-1.9 1.9-1.6-.4-.4-1.6z" fill="currentColor"></path><path d="M2.6 2.6l1.6-.8 2.6 2.6-.8.8 4.6 4.6M11.4 11.4l1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>', 1), ps = /* @__PURE__ */ b('<path d="M7.8 1.8c-3 0-5.2 2.1-5.2 4.9 0 1.4.5 2.4 1.3 3.3v3.6c0 .4.3.6.6.6h4.2c.3 0 .6-.3.6-.6v-1.4h1.6c.7 0 1.2-.5 1.2-1.2V9.3l1.1-.4c.3-.1.4-.5.2-.8l-1.3-2C12 3.7 10.3 1.8 7.8 1.8z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M5.4 6.6c0-1.1.9-1.8 1.8-1.8.4-.5 1-.7 1.6-.5M6.6 8.6c.5.4 1.3.4 1.8 0" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>', 1), gs = /* @__PURE__ */ b('<path d="M5.3 8.2V3.4a.95.95 0 0 1 1.9 0v3.8V2.5a.95.95 0 0 1 1.9 0v4.7V3.2a.95.95 0 0 1 1.9 0v4.6-2.4a.9.9 0 0 1 1.8 0v4.4c0 2.8-1.9 4.7-4.5 4.7-1.7 0-2.8-.7-3.8-2L2.6 9.5a1 1 0 0 1 1.5-1.3z" fill="currentColor"></path>'), ms = /* @__PURE__ */ b('<path d="M2.6 4h10.8M6 4V2.6h4V4M4 4l.7 9.4h6.6L12 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>'), ks = /* @__PURE__ */ b('<path d="M2.2 11.4a6 6 0 1 1 11.6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 10.2 5.4 6.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><circle cx="8" cy="10.4" r="1.3" fill="currentColor"></circle>', 1), ws = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M8 6v3.4" stroke="#000" stroke-width="1.7" stroke-linecap="round"></path><circle cx="8" cy="11.6" r="1" fill="#000"></circle></mask><path d="M6.9 2.3a1.3 1.3 0 0 1 2.2 0l5.5 9.7c.5.9-.1 1.9-1.1 1.9H2.5c-1 0-1.6-1-1.1-1.9z" fill="currentColor"></path>', 1), ys = /* @__PURE__ */ b('<path d="M2.2 4.4 6.6 1.6l3.6 2.4-1.4 1.8-1.6-.6-.8 1 6.3 6.4a1.2 1.2 0 0 1-1.7 1.7L4.6 8l-1 .9z" fill="currentColor"></path>'), bs = /* @__PURE__ */ b('<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M8 1.8a6.2 6.2 0 0 0 0 12.4z" fill="currentColor"></path>', 1), Ms = /* @__PURE__ */ b('<rect x="1.2" y="2.4" width="13.6" height="11.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"></rect><rect x="8.4" y="4.6" width="4.2" height="6.8" rx="1" fill="currentColor"></rect>', 1), Es = /* @__PURE__ */ b('<path d="M14 2 9.4 6.6M9.2 3v3.8H13M2 14l4.6-4.6M3 9.2h3.8V13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>'), Cs = /* @__PURE__ */ b('<path d="M9.4 6.6 14 2M10.2 2H14v3.8M6.6 9.4 2 14M2 10.2V14h3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>'), xs = /* @__PURE__ */ b('<path d="M3 8h10" stroke="currentColor" stroke-width="1"></path>'), Ss = /* @__PURE__ */ b('<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1"></path>'), As = /* @__PURE__ */ b('<rect x="3.6" y="1.6" width="10.8" height="8.4" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="1.4" y="5.4" width="10.4" height="8.8" rx="1.8" fill="currentColor"></rect><path d="M3.6 8.6 5.2 10l-1.6 1.4M6.4 11.8h2.8" fill="none" stroke="rgb(20 20 30)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"></path>', 1), Ts = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M5.2 8.2l1.9 1.9 3.8-4.2" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></mask><path d="M8 .9l1.6 1.2 2-.1.6 1.9 1.7 1.1-.6 1.9.6 1.9-1.7 1.1-.6 1.9-2-.1L8 15.1l-1.6-1.2-2 .1-.6-1.9-1.7-1.1.6-1.9-.6-1.9 1.7-1.1.6-1.9 2 .1z" fill="currentColor" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"></path>', 1), zs = /* @__PURE__ */ b('<rect x="1.6" y="1.6" width="12.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M6 10 10.4 5.6M7 5.4h3.6V9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>', 1), qs = /* @__PURE__ */ b('<rect x="1.6" y="1.6" width="12.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>', 1), Rs = /* @__PURE__ */ b('<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M3.8 3.8l8.4 8.4" stroke="currentColor" stroke-width="1.5"></path>', 1), Ns = /* @__PURE__ */ b('<svg viewBox="0 0 16 16" aria-hidden="true"><!></svg>');
function Ot(e, t) {
  const r = hi();
  let n = yt(t, "size", 3, 12), a = yt(t, "class", 3, "");
  const i = `url(#${r})`;
  var s = Ns(), l = z(s);
  {
    var o = (f) => {
      var d = Fi();
      k(f, d);
    }, u = (f) => {
      var d = Vi();
      k(f, d);
    }, c = (f) => {
      var d = Hi();
      k(f, d);
    }, v = (f) => {
      var d = Bi();
      k(f, d);
    }, _ = (f) => {
      var d = Ui();
      H(() => Z(d, "fill", t.name === "star-fill" ? "currentColor" : "none")), k(f, d);
    }, h = (f) => {
      var d = Yi();
      k(f, d);
    }, p = (f) => {
      var d = Qi(), L = Ue(d), Q = E(z(L));
      {
        var ie = (K) => {
          var we = Gi();
          k(K, we);
        }, Ct = (K) => {
          var we = Wi();
          k(K, we);
        }, xt = (K) => {
          var we = Ki();
          k(K, we);
        }, ir = (K) => {
          var we = Zi();
          k(K, we);
        }, Zn = (K) => {
          var we = Xi();
          k(K, we);
        }, Xn = (K) => {
          var we = Ji();
          k(K, we);
        };
        ge(Q, (K) => {
          t.name === "xmark-circle" ? K(ie) : t.name === "check-circle" ? K(Ct, 1) : t.name === "pause-circle" ? K(xt, 2) : t.name === "minus-circle" ? K(ir, 3) : t.name === "arrow-down-circle" ? K(Zn, 4) : K(Xn, -1);
        });
      }
      var Jn = E(L);
      H(() => {
        Z(L, "id", r), Z(Jn, "mask", i);
      }), k(f, d);
    }, w = (f) => {
      var d = $i();
      k(f, d);
    }, m = (f) => {
      var d = ts(), L = E(Ue(d), 2);
      {
        var Q = (ie) => {
          var Ct = es();
          k(ie, Ct);
        };
        ge(L, (ie) => {
          t.name === "bell-slash" && ie(Q);
        });
      }
      k(f, d);
    }, y = (f) => {
      var d = rs();
      k(f, d);
    }, C = (f) => {
      var d = ns();
      k(f, d);
    }, R = (f) => {
      var d = as();
      k(f, d);
    }, x = (f) => {
      var d = ss(), L = Ue(d), Q = z(L), ie = E(L);
      {
        var Ct = (xt) => {
          var ir = is();
          k(xt, ir);
        };
        ge(ie, (xt) => {
          t.name === "pin-slash" && xt(Ct);
        });
      }
      H(() => {
        Z(L, "transform", t.name === "pin-slash" ? "rotate(45 8 8)" : ""), Z(Q, "fill", t.name === "pin" ? "currentColor" : "none");
      }), k(f, d);
    }, D = (f) => {
      var d = ls();
      k(f, d);
    }, ne = (f) => {
      var d = os();
      k(f, d);
    }, B = (f) => {
      var d = fs();
      k(f, d);
    }, le = (f) => {
      var d = us(), L = Ue(d), Q = E(L);
      H(() => {
        Z(L, "id", r), Z(Q, "mask", i);
      }), k(f, d);
    }, oe = (f) => {
      var d = cs();
      k(f, d);
    }, O = (f) => {
      var d = vs();
      k(f, d);
    }, Se = (f) => {
      var d = hs();
      k(f, d);
    }, Ie = (f) => {
      var d = ds();
      k(f, d);
    }, Ze = (f) => {
      var d = _s();
      k(f, d);
    }, it = (f) => {
      var d = ps();
      k(f, d);
    }, Ve = (f) => {
      var d = gs();
      k(f, d);
    }, Et = (f) => {
      var d = ms();
      k(f, d);
    }, st = (f) => {
      var d = ks();
      k(f, d);
    }, Xe = (f) => {
      var d = ws(), L = Ue(d), Q = E(L);
      H(() => {
        Z(L, "id", r), Z(Q, "mask", i);
      }), k(f, d);
    }, A = (f) => {
      var d = ys();
      k(f, d);
    }, P = (f) => {
      var d = bs();
      k(f, d);
    }, de = (f) => {
      var d = Ms();
      k(f, d);
    }, ke = (f) => {
      var d = Es();
      k(f, d);
    }, Ae = (f) => {
      var d = Cs();
      k(f, d);
    }, U = (f) => {
      var d = xs();
      k(f, d);
    }, W = (f) => {
      var d = Ss();
      k(f, d);
    }, ae = (f) => {
      var d = As();
      k(f, d);
    }, q = (f) => {
      var d = Ts(), L = Ue(d), Q = E(L);
      H(() => {
        Z(L, "id", r), Z(Q, "mask", i);
      }), k(f, d);
    }, I = (f) => {
      var d = zs();
      k(f, d);
    }, te = (f) => {
      var d = qs();
      k(f, d);
    }, He = (f) => {
      var d = Rs();
      k(f, d);
    };
    ge(l, (f) => {
      t.name === "chevron-right" ? f(o) : t.name === "chevron-down" ? f(u, 1) : t.name === "chevron-left" ? f(c, 2) : t.name === "folder" ? f(v, 3) : t.name === "star" || t.name === "star-fill" ? f(_, 4) : t.name === "xmark" ? f(h, 5) : t.name === "xmark-circle" || t.name === "check-circle" || t.name === "pause-circle" || t.name === "minus-circle" || t.name === "arrow-down-circle" || t.name === "person" ? f(p, 6) : t.name === "ellipsis" ? f(w, 7) : t.name === "bell" || t.name === "bell-slash" ? f(m, 8) : t.name === "refresh" ? f(y, 9) : t.name === "compress" ? f(C, 10) : t.name === "expand" ? f(R, 11) : t.name === "pin" || t.name === "pin-slash" ? f(x, 12) : t.name === "person-plus" ? f(D, 13) : t.name === "person-switch" ? f(ne, 14) : t.name === "swap" ? f(B, 15) : t.name === "terminal" ? f(le, 16) : t.name === "terminal-outline" ? f(oe, 17) : t.name === "moon-stars" ? f(O, 18) : t.name === "moon-zzz" ? f(Se, 19) : t.name === "people" ? f(Ie, 20) : t.name === "wrench" ? f(Ze, 21) : t.name === "brain" ? f(it, 22) : t.name === "hand" ? f(Ve, 23) : t.name === "trash" ? f(Et, 24) : t.name === "gauge" ? f(st, 25) : t.name === "warn" ? f(Xe, 26) : t.name === "hammer" ? f(A, 27) : t.name === "half-circle" ? f(P, 28) : t.name === "snap-right" ? f(de, 29) : t.name === "shrink" ? f(ke, 30) : t.name === "grow" ? f(Ae, 31) : t.name === "win-min" ? f(U, 32) : t.name === "win-close" ? f(W, 33) : t.name === "shells" ? f(ae, 34) : t.name === "seal-check" ? f(q, 35) : t.name === "app-forward" ? f(I, 36) : t.name === "app-plus" ? f(te, 37) : t.name === "nosign" && f(He, 38);
    });
  }
  H(() => {
    nt(s, 0, `icon ${a() ?? ""}`, "svelte-1rfkemj"), Z(s, "width", n()), Z(s, "height", n());
  }), k(e, s);
}
function Er(e) {
  switch (e) {
    case "working":
      return "115 168 255";
    case "waiting":
      return "255 168 92";
    case "idle":
      return "107 217 153";
    case "paused":
      return "242 204 89";
    default:
      return "140 140 140";
  }
}
const ft = { waiting: 0, working: 1, paused: 2, idle: 3 }, Kn = (e) => ({ 접수: "waiting", "진행 중": "working", 대기: "paused", 완료: "idle" })[e] || "waiting";
function Cr(e) {
  let t = "idle", r = 99;
  for (const n of e.sessions)
    ft[n.state] < r && (r = ft[n.state], t = n.state);
  return t;
}
const Os = (e) => e.sessions.filter((t) => t.state === "waiting" || t.state === "working");
function Is(e, t) {
  const r = Math.max(0, Math.floor((t - e) / 1e3));
  return r < 60 ? `${r}초` : r < 3600 ? `${Math.floor(r / 60)}분 ${r % 60}초` : r >= 86400 ? `${Math.floor(r / 86400)}일 ${Math.floor(r % 86400 / 3600)}시간` : `${Math.floor(r / 3600)}시간 ${Math.floor(r % 3600 / 60)}분`;
}
function Ls(e, { query: t = "", status: r = "", groupBy: n = "category" } = {}) {
  const a = e.filter((s) => (!r || s.status === r) && [s.title, s.requester, s.department, s.description].some((l) => String(l || "").toLowerCase().includes(t.toLowerCase()))), i = /* @__PURE__ */ new Map();
  for (const s of a) {
    const l = s[n] || "미분류";
    i.has(l) || i.set(l, { id: l, name: l, sessions: [] }), i.get(l).sessions.push({ ...s, state: Kn(s.status) });
  }
  for (const s of i.values()) s.sessions.sort((l, o) => ft[l.state] - ft[o.state] || (l.due_date || "9999").localeCompare(o.due_date || "9999") || o.created_at.localeCompare(l.created_at));
  return [...i.values()].sort((s, l) => ft[Cr(s)] - ft[Cr(l)] || s.name.localeCompare(l.name, "ko"));
}
var js = /* @__PURE__ */ J('<span class="track svelte-aqlqqq"></span> <span class="spin svelte-aqlqqq"><span class="head svelte-aqlqqq"></span></span>', 1), Ds = /* @__PURE__ */ J('<span class="ripple svelte-aqlqqq"></span> <span class="dot svelte-aqlqqq"></span>', 1), Jr = /* @__PURE__ */ J('<span class="pop svelte-aqlqqq"><!></span>'), Ps = /* @__PURE__ */ J('<span class="pop ended svelte-aqlqqq"><!></span>'), Fs = /* @__PURE__ */ J('<span class="inner svelte-aqlqqq"><!></span>'), Vs = /* @__PURE__ */ J('<span class="box svelte-aqlqqq"><!></span>');
function er(e, t) {
  Pt(t, !0);
  let r = yt(t, "scale", 3, 1);
  var n = Vs();
  let a;
  var i = z(n);
  bi(i, () => t.state, (s) => {
    var l = Fs(), o = z(l);
    {
      var u = (p) => {
        var w = js();
        k(p, w);
      }, c = (p) => {
        var w = Ds();
        k(p, w);
      }, v = (p) => {
        var w = Jr(), m = z(w);
        Ot(m, { name: "check-circle", size: 16 }), k(p, w);
      }, _ = (p) => {
        var w = Jr(), m = z(w);
        Ot(m, { name: "pause-circle", size: 16 }), k(p, w);
      }, h = (p) => {
        var w = Ps(), m = z(w);
        Ot(m, { name: "minus-circle", size: 15 }), k(p, w);
      };
      ge(o, (p) => {
        t.state === "working" ? p(u) : t.state === "waiting" ? p(c, 1) : t.state === "idle" ? p(v, 2) : t.state === "paused" ? p(_, 3) : p(h, -1);
      });
    }
    k(s, l);
  }), H((s) => a = Mr(n, "", a, { "--c": s, "--s": r() }), [() => Er(t.state)]), k(e, n), Ft();
}
var Hs = /* @__PURE__ */ J('<button class="request-row svelte-v68t2j"><!> <span class="request-main svelte-v68t2j"><strong class="svelte-v68t2j"> </strong><span class="svelte-v68t2j"> </span></span> <span class="request-end svelte-v68t2j"><span class="request-status svelte-v68t2j"> </span><small> </small><small class="svelte-v68t2j"> </small></span></button>');
function Qr(e, t) {
  Pt(t, !0);
  const r = /* @__PURE__ */ ye(() => t.task.status !== "완료" && t.task.due_date && t.task.due_date < t.today);
  var n = Hs(), a = z(n);
  er(a, {
    get state() {
      return t.task.state;
    }
  });
  var i = E(a, 2), s = z(i), l = X(s, !0), o = E(s), u = X(o), c = E(i, 2), v = z(c), _ = X(v), h = E(v);
  let p;
  var w = X(h, !0), m = E(h), y = X(m, !0);
  H(
    (C) => {
      j(l, t.task.title), j(u, `${t.task.requester ?? ""}${t.task.department ? " · " + t.task.department : ""} · ${t.task.channel ?? ""}`), j(_, `${t.task.status ?? ""}${t.task.priority === "높음" ? " · 중요" : ""}`), p = nt(h, 1, "svelte-v68t2j", null, p, { overdue: g(r) }), j(w, t.task.due_date ? `기한 ${t.task.due_date}` : "기한 미지정"), j(y, C);
    },
    [
      () => t.task.status === "완료" ? "처리 완료" : "접수 후 " + Is(Date.parse(t.task.created_at), t.now)
    ]
  ), je("click", n, () => t.onopen(t.task.id)), k(e, n), Ft();
}
Ir(["click"]);
var Bs = /* @__PURE__ */ J('<span class="count svelte-sz6uh1"><span class="dot svelte-sz6uh1"></span> </span>'), Us = /* @__PURE__ */ J('<button class="completed-toggle svelte-sz6uh1"><span class="svelte-sz6uh1"> </span><span class="svelte-sz6uh1">이력 보기</span></button><!>', 1), Ys = /* @__PURE__ */ J('<div class="body svelte-sz6uh1"><!> <!></div>'), Gs = /* @__PURE__ */ J('<button class="svelte-sz6uh1"><!><span class="svelte-sz6uh1"> </span></button>'), Ws = /* @__PURE__ */ J('<small class="svelte-sz6uh1"> </small>'), Ks = /* @__PURE__ */ J('<div class="compact-list svelte-sz6uh1"><!><!></div>'), Zs = /* @__PURE__ */ J('<div><button class="head svelte-sz6uh1"><span><!></span> <span class="folder svelte-sz6uh1"><!></span> <span class="names svelte-sz6uh1"><span class="name svelte-sz6uh1"> </span><span class="path svelte-sz6uh1"><!></span></span> <span class="counts svelte-sz6uh1"></span></button> <!></div>');
function Xs(e, t) {
  Pt(t, !0);
  let r = yt(t, "compact", 3, !1), n = /* @__PURE__ */ $(!1), a = /* @__PURE__ */ $(!1);
  const i = /* @__PURE__ */ ye(() => Cr(t.g)), s = /* @__PURE__ */ ye(() => Er(g(i))), l = /* @__PURE__ */ ye(() => Os(t.g)), o = /* @__PURE__ */ ye(() => g(l)[0]), u = /* @__PURE__ */ ye(() => t.g.sessions.filter((A) => A.status !== "완료")), c = /* @__PURE__ */ ye(() => t.g.sessions.filter((A) => A.status === "완료")), v = /* @__PURE__ */ ye(() => ["waiting", "working", "paused", "idle"].map((A) => ({
    st: A,
    n: t.g.sessions.filter((P) => P.state === A).length
  })).filter((A) => A.n)), _ = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(/* @__PURE__ */ new Date());
  var h = Zs();
  let p, w;
  var m = z(h), y = z(m);
  let C;
  var R = z(y);
  Ot(R, { name: "chevron-right", size: 11 });
  var x = E(y, 2), D = z(x);
  {
    var ne = (A) => {
      er(A, {
        get state() {
          return g(o).state;
        }
      });
    }, B = (A) => {
      Ot(A, { name: "folder", size: 14 });
    };
    ge(D, (A) => {
      g(n) && g(o) ? A(ne) : A(B, -1);
    });
  }
  var le = E(x, 2), oe = z(le), O = X(oe, !0), Se = E(oe), Ie = z(Se);
  {
    var Ze = (A) => {
      var P = Gr();
      H(() => j(P, `${g(o).status ?? ""} · ${g(o).title ?? ""}`)), k(A, P);
    }, it = (A) => {
      var P = Gr();
      H(() => j(P, `전체 ${t.g.sessions.length ?? ""}건 · 미완료 ${g(u).length ?? ""}건`)), k(A, P);
    };
    ge(Ie, (A) => {
      g(n) && g(o) ? A(Ze) : A(it, -1);
    });
  }
  var Ve = E(le, 2);
  ot(Ve, 21, () => g(v), yr, (A, P) => {
    var de = Bs(), ke = z(de);
    let Ae;
    var U = E(ke, 1, !0);
    H(
      (W) => {
        Ae = Mr(ke, "", Ae, { background: W }), j(U, g(P).n);
      },
      [() => `rgb(${Er(g(P).st) ?? ""})`]
    ), k(A, de);
  });
  var Et = E(m, 2);
  {
    var st = (A) => {
      var P = Ys(), de = z(P);
      ot(de, 17, () => g(u), (U) => U.id, (U, W) => {
        Qr(U, {
          get task() {
            return g(W);
          },
          get now() {
            return t.now;
          },
          get onopen() {
            return t.onopen;
          },
          get today() {
            return _;
          }
        });
      });
      var ke = E(de, 2);
      {
        var Ae = (U) => {
          var W = Us(), ae = Ue(W), q = z(ae), I = X(q), te = E(ae);
          {
            var He = (f) => {
              var d = vi(), L = Ue(d);
              ot(L, 17, () => g(c), (Q) => Q.id, (Q, ie) => {
                Qr(Q, {
                  get task() {
                    return g(ie);
                  },
                  get now() {
                    return t.now;
                  },
                  get onopen() {
                    return t.onopen;
                  },
                  get today() {
                    return _;
                  }
                });
              }), k(f, d);
            };
            ge(te, (f) => {
              g(a) && f(He);
            });
          }
          H(() => {
            Z(ae, "aria-expanded", g(a)), j(I, `${g(a) ? "▾" : "▸"} 완료 업무 ${g(c).length ?? ""}건`);
          }), je("click", ae, () => V(a, !g(a))), k(U, W);
        };
        ge(ke, (U) => {
          g(c).length && U(Ae);
        });
      }
      k(A, P);
    }, Xe = (A) => {
      var P = Ks(), de = z(P);
      ot(de, 17, () => t.g.sessions.slice(0, 3), yr, (U, W) => {
        var ae = Gs(), q = z(ae);
        er(q, {
          get state() {
            return g(W).state;
          },
          scale: 0.7
        });
        var I = E(q), te = X(I, !0);
        H(() => j(te, g(W).title)), je("click", ae, () => t.onopen(g(W).id)), k(U, ae);
      });
      var ke = E(de);
      {
        var Ae = (U) => {
          var W = Ws(), ae = X(W);
          H(() => j(ae, `상세 보기에서 나머지 ${t.g.sessions.length - 3}건을 확인하세요.`)), k(U, W);
        };
        ge(ke, (U) => {
          t.g.sessions.length > 3 && U(Ae);
        });
      }
      k(A, P);
    };
    ge(Et, (A) => {
      !g(n) && !r() ? A(st) : r() && !g(n) && A(Xe, 1);
    });
  }
  H(() => {
    p = nt(h, 1, "card svelte-sz6uh1", null, p, { waiting: g(i) === "waiting" }), w = Mr(h, "", w, { "--c": g(s) }), Z(m, "aria-expanded", !g(n)), C = nt(y, 1, "chev svelte-sz6uh1", null, C, { open: !g(n) }), j(O, t.g.name);
  }), je("click", m, () => V(n, !g(n))), k(e, h), Ft();
}
Ir(["click"]);
var Js = /* @__PURE__ */ J('<button><!> <b class="svelte-nytrg3"> </b></button>'), Qs = /* @__PURE__ */ J('<p role="alert"> </p>'), $s = /* @__PURE__ */ J('<div class="board-empty svelte-nytrg3"><strong class="svelte-nytrg3"> </strong><p class="svelte-nytrg3"> </p></div>'), el = /* @__PURE__ */ J('<section class="claude-workboard svelte-nytrg3" aria-label="총무 업무 카드 보드"><div class="board-title svelte-nytrg3"><div><p class="svelte-nytrg3">GENERAL AFFAIRS · LIVE BOARD</p><h2 class="svelte-nytrg3">흩어진 요청을, 한 장의 보드로.</h2><span class="svelte-nytrg3">분류별로 모으고, 상태별로 살펴보세요.</span></div><span class="board-role svelte-nytrg3"> </span></div> <div class="state-chips svelte-nytrg3" aria-label="업무 상태 필터"><button>전체 <b class="svelte-nytrg3"> </b></button><!></div> <div class="board-controls svelte-nytrg3"><input type="search" placeholder="업무·요청자·부서·내용 검색" aria-label="업무 검색" class="svelte-nytrg3"/><select aria-label="카드 분류 기준" class="svelte-nytrg3"><option>업무 분류별</option><option>요청 부서별</option><option>접수 경로별</option></select><button class="svelte-nytrg3"> </button><button class="svelte-nytrg3">CSV 내보내기</button><button class="svelte-nytrg3"> </button></div> <!> <div class="board-summary svelte-nytrg3"><span> </span><small class="svelte-nytrg3">접수 → 진행 중 → 대기 → 완료 순 · 시각은 한국 시간 기준</small></div> <div></div> <p class="board-credit svelte-nytrg3">Claude Board의 카드·상태 컴포넌트를 총무 업무용으로 적용했습니다. <a href="/third-party-notices" target="_blank" rel="noreferrer" class="svelte-nytrg3">오픈소스 안내 ↗</a></p></section>');
function tl(e, t) {
  Pt(t, !0);
  let r = yt(t, "tasks", 7), n = yt(t, "readonly", 3, !1), a = /* @__PURE__ */ $(""), i = /* @__PURE__ */ $(""), s = /* @__PURE__ */ $("category"), l = /* @__PURE__ */ $(!1), o = /* @__PURE__ */ $($e(Date.now())), u = /* @__PURE__ */ $(!1), c = /* @__PURE__ */ $("");
  const v = ["접수", "진행 중", "대기", "완료"], _ = /* @__PURE__ */ ye(() => Ls(r(), {
    query: g(a),
    status: g(i),
    groupBy: g(s)
  })), h = /* @__PURE__ */ ye(() => g(_).reduce((q, I) => q + I.sessions.length, 0));
  Qa(() => {
    const q = setInterval(() => V(o, Date.now(), !0), 6e4);
    return () => clearInterval(q);
  });
  async function p() {
    V(u, !0), V(c, "");
    try {
      r(await t.onrefresh());
    } catch (q) {
      V(c, q.message, !0);
    } finally {
      V(u, !1);
    }
  }
  var w = el(), m = z(w), y = E(z(m)), C = X(y, !0), R = E(m, 2), x = z(R);
  let D;
  var ne = E(z(x)), B = X(ne, !0), le = E(x);
  ot(le, 17, () => v, yr, (q, I) => {
    var te = Js();
    let He;
    var f = z(te);
    {
      let ie = /* @__PURE__ */ ye(() => Kn(g(I)));
      er(f, {
        get state() {
          return g(ie);
        },
        scale: 0.8
      });
    }
    var d = E(f, 1, !0), L = E(d), Q = X(L, !0);
    H(
      (ie) => {
        Z(te, "aria-pressed", g(i) === g(I)), He = nt(te, 1, "svelte-nytrg3", null, He, { chosen: g(i) === g(I) }), j(d, g(I)), j(Q, ie);
      },
      [() => r().filter((ie) => ie.status === g(I)).length]
    ), je("click", te, () => V(i, g(i) === g(I) ? "" : g(I), !0)), k(q, te);
  });
  var oe = E(R, 2), O = z(oe), Se = E(O), Ie = z(Se);
  Ie.value = Ie.__value = "category";
  var Ze = E(Ie);
  Ze.value = Ze.__value = "department";
  var it = E(Ze);
  it.value = it.__value = "channel", zi(Se);
  var Ve = E(Se), Et = X(Ve, !0), st = E(Ve), Xe = E(st), A = X(Xe, !0), P = E(oe, 2);
  {
    var de = (q) => {
      var I = Qs(), te = X(I, !0);
      H(() => j(te, g(c))), k(q, I);
    };
    ge(P, (q) => {
      g(c) && q(de);
    });
  }
  var ke = E(P, 2), Ae = z(ke), U = X(Ae), W = E(ke, 2);
  let ae;
  ot(
    W,
    21,
    () => g(_),
    (q) => q.id,
    (q, I) => {
      Xs(q, {
        get g() {
          return g(I);
        },
        get now() {
          return g(o);
        },
        get onopen() {
          return t.onopen;
        },
        get compact() {
          return g(l);
        }
      });
    },
    (q) => {
      var I = $s(), te = z(I), He = X(te, !0), f = E(te), d = X(f, !0);
      H(() => {
        j(He, r().length ? "조건에 맞는 업무가 없습니다." : "첫 업무를 기록해 보세요."), j(d, r().length ? "검색어나 상태 필터를 바꿔보세요." : n() ? "담당자가 등록한 업무가 이곳에 표시됩니다." : "오른쪽 위 새 업무 등록 버튼으로 구두·메신저 요청을 접수하세요.");
      }), k(q, I);
    }
  ), H(() => {
    j(C, n() ? "조회 전용" : "업무 관리"), Z(x, "aria-pressed", !g(i)), D = nt(x, 1, "svelte-nytrg3", null, D, { chosen: !g(i) }), j(B, r().length), Z(Ve, "aria-pressed", g(l)), j(Et, g(l) ? "상세 보기" : "간략 보기"), Xe.disabled = g(u), j(A, g(u) ? "불러오는 중…" : "새로고침"), j(U, `${g(_).length ?? ""}개 그룹 · ${g(h) ?? ""}건`), ae = nt(W, 1, "group-grid svelte-nytrg3", null, ae, { compact: g(l) });
  }), je("click", x, () => V(i, "")), ji(O, () => g(a), (q) => V(a, q)), qi(Se, () => g(s), (q) => V(s, q)), je("click", Ve, () => V(l, !g(l))), je("click", st, function(...q) {
    t.onexport?.apply(this, q);
  }), je("click", Xe, p), k(e, w), Ft();
}
Ir(["click"]);
function nl(e, t) {
  const r = mi(tl, { target: e, props: t });
  return () => wi(r);
}
export {
  nl as mountBoard
};
