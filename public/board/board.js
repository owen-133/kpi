var ar = Array.isArray, Qn = Array.prototype.indexOf, jt = Array.prototype.includes, ir = Array.from, rn = Object.defineProperty, dt = Object.getOwnPropertyDescriptor, $n = Object.getOwnPropertyDescriptors, ea = Object.prototype, ta = Array.prototype, nn = Object.getPrototypeOf, Pr = Object.isExtensible;
const ra = () => {
};
function na(e) {
  for (var t = 0; t < e.length; t++)
    e[t]();
}
function an() {
  var e, t, r = new Promise((n, a) => {
    e = n, t = a;
  });
  return { promise: r, resolve: e, reject: t };
}
const ae = 2, kt = 4, sr = 8, sn = 1 << 24, Me = 16, Se = 32, We = 64, pr = 128, Tr = 256, xe = 512, K = 1024, O = 2048, _e = 4096, se = 8192, te = 16384, Ct = 32768, Jt = 1 << 25, wt = 65536, Qt = 1 << 17, aa = 1 << 18, xt = 1 << 19, ia = 1 << 20, ze = 1 << 25, $t = 1 << 21, _t = 1 << 22, Ge = 1 << 23, pt = /* @__PURE__ */ Symbol("$state"), ln = /* @__PURE__ */ Symbol("component"), sa = /* @__PURE__ */ Symbol("legacy props"), la = /* @__PURE__ */ Symbol(""), on = /* @__PURE__ */ Symbol("attributes"), gr = /* @__PURE__ */ Symbol("class"), mr = /* @__PURE__ */ Symbol("style"), kr = /* @__PURE__ */ Symbol("text"), Zt = /* @__PURE__ */ Symbol("form reset"), Vt = new class extends Error {
  name = "StaleReactionError";
  message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), oa = 1, fa = 2, fn = 4, ua = 8, ca = 16, va = 1, ha = 4, da = 8, _a = 16, un = 1, pa = 2, cn = {}, W = /* @__PURE__ */ Symbol("uninitialized"), ga = "http://www.w3.org/1999/xhtml";
function ma() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function ka() {
  console.warn("https://svelte.dev/e/select_multiple_invalid_value");
}
function wa() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
function vn(e) {
  return e === this.v;
}
function ya(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function hn(e) {
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
function yt(e) {
  ue = e;
}
function Ht(e, t = !1, r) {
  ue = {
    p: ue,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: (
      /** @type {Effect} */
      q
    ),
    l: null
  };
}
function Bt(e) {
  var t = (
    /** @type {ComponentContext} */
    ue
  ), r = t.e;
  if (r !== null) {
    t.e = null;
    for (var n of r)
      On(n);
  }
  return t.i = !0, ue = t.p, dn(e);
}
function dn(e = {}) {
  return rn(e, ln, { value: !0 }), e;
}
function _n() {
  return !0;
}
let Je = [];
function pn() {
  var e = Je;
  Je = [], na(e);
}
function Ye(e) {
  if (Je.length === 0 && !Ot) {
    var t = Je;
    queueMicrotask(() => {
      t === Je && pn();
    });
  }
  Je.push(e);
}
function Na() {
  for (; Je.length > 0; )
    pn();
}
const Oa = -7169;
function V(e, t) {
  e.f = e.f & Oa | t;
}
function zr(e) {
  (e.f & xe) !== 0 || e.deps === null ? V(e, K) : V(e, _e);
}
function gn(e, t) {
  (e.f & O) !== 0 ? t.set(e, O) : (e.f & _e) !== 0 && t.get(e) !== O && t.set(e, _e), V(e, K);
}
let Fr = !1;
function Ia() {
  Fr || (Fr = !0, document.addEventListener(
    "reset",
    (e) => {
      Promise.resolve().then(() => {
        if (!e.defaultPrevented)
          for (
            const t of
            /**@type {HTMLFormElement} */
            e.target.elements
          )
            t[Zt]?.();
      });
    },
    // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
    { capture: !0 }
  ));
}
function Ut(e) {
  var t = S, r = q;
  ke(null), Ne(null);
  try {
    return e();
  } finally {
    ke(t), Ne(r);
  }
}
function mn(e, t, r, n = r) {
  e.addEventListener(t, () => Ut(r));
  const a = (
    /** @type {any} */
    e[Zt]
  );
  a ? e[Zt] = () => {
    a(), n(!0);
  } : e[Zt] = () => n(!0), Ia();
}
function La(e, t, r, n) {
  const a = Pt;
  var i = e.filter((h) => !h.settled), s = t.map(a);
  if (r.length === 0 && i.length === 0) {
    n(s);
    return;
  }
  var l = (
    /** @type {Effect} */
    q
  ), o = Da(), u = i.length === 1 ? i[0].promise : i.length > 1 ? Promise.all(i.map((h) => h.promise)) : null;
  function c(h) {
    if ((l.f & te) === 0) {
      o();
      try {
        n([...s, ...h]);
      } catch (p) {
        Te(p, l);
      }
      er();
    }
  }
  var v = kn();
  if (r.length === 0) {
    u.then(() => c([])).finally(v);
    return;
  }
  function _() {
    Promise.all(r.map((h) => /* @__PURE__ */ ja(h))).then(c).catch((h) => Te(h, l)).finally(v);
  }
  u ? u.then(() => {
    if ((l.f & te) !== 0) {
      v();
      return;
    }
    o(), _(), er();
  }) : _();
}
function Da() {
  var e = (
    /** @type {Effect} */
    q
  ), t = S, r = ue, n = (
    /** @type {Batch} */
    M
  );
  return function(i = !0) {
    Ne(e), ke(t), yt(r), i && (e.f & te) === 0 && (n?.activate(), n?.apply());
  };
}
function er(e = !0) {
  Ne(null), ke(null), yt(null), e && M?.deactivate();
}
function kn() {
  var e = (
    /** @type {Effect} */
    q
  ), t = e.b, r = (
    /** @type {Batch} */
    M
  ), n = !!t?.is_rendered();
  return t?.update_pending_count(1, r), r.increment(n, e), () => {
    t?.update_pending_count(-1, r), r.decrement(n, e);
  };
}
// @__NO_SIDE_EFFECTS__
function Pt(e) {
  var t = ae | O;
  return q !== null && (q.f |= xt), {
    ctx: ue,
    deps: null,
    effects: null,
    equals: vn,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      W
    ),
    wv: 0,
    parent: q,
    ac: null
  };
}
const qt = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function ja(e, t, r) {
  let n = (
    /** @type {Effect | null} */
    q
  );
  n === null && ba();
  var a = (
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0
  ), i = at(
    /** @type {V} */
    W
  ), s = !S, l = /* @__PURE__ */ new Set();
  return ti(() => {
    var o = (
      /** @type {Effect} */
      q
    ), u = an();
    a = u.promise;
    try {
      Promise.resolve(e()).then(u.resolve, (h) => {
        h !== Vt && u.reject(h);
      }).finally(er);
    } catch (h) {
      u.reject(h), er();
    }
    var c = (
      /** @type {Batch} */
      M
    );
    if (s) {
      if ((o.f & Ct) !== 0)
        var v = kn();
      if (
        // boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
        n.b?.is_rendered()
      )
        c.async_deriveds.get(o)?.reject(qt);
      else
        for (const h of l.values())
          h.reject(qt);
      l.add(u), c.async_deriveds.set(o, u);
    }
    const _ = (h, p = void 0) => {
      v?.(), l.delete(u), p !== qt && (c.activate(), p ? (i.f |= Ge, bt(i, p)) : ((i.f & Ge) !== 0 && (i.f ^= Ge), bt(i, h)), c.deactivate());
    };
    u.promise.then(_, (h) => _(null, h || "unknown"));
  }), Nn(() => {
    for (const o of l)
      o.reject(qt);
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
function be(e) {
  const t = /* @__PURE__ */ Pt(e);
  return Fn(t), t;
}
// @__NO_SIDE_EFFECTS__
function wn(e) {
  const t = /* @__PURE__ */ Pt(e);
  return t.equals = hn, t;
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
function qr(e) {
  var t, r = q, n = e.parent;
  if (!De && n !== null && e.v !== W && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
  (n.f & (te | se)) !== 0)
    return ma(), e.v;
  Ne(n);
  try {
    Pa(e), t = Un(e);
  } finally {
    Ne(r);
  }
  return t;
}
function yn(e) {
  var t = qr(e);
  if (!e.equals(t) && (e.wv = Hn(), (!M?.is_fork || e.deps === null) && (M !== null ? (M.capture(e, t, !0), gt?.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    V(e, K);
    return;
  }
  De || (Ee !== null ? (Or() || M?.is_fork) && Ee.set(e, t) : zr(e));
}
function Fa(e) {
  if (e.effects !== null)
    for (const t of e.effects)
      (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && Ut(() => {
        t.ac.abort(Vt), t.ac = null;
      }), t.fn !== null && (t.teardown = ra), Ft(t, 0), Ir(t));
}
function bn(e) {
  if (e.effects !== null)
    for (const t of e.effects)
      t.teardown && t.fn !== null && Mt(t);
}
let fr = null, ct = null, M = null, gt = null, Ee = null, wr = null, Ot = !1, ur = !1, It = null, Xt = null;
var Vr = 0;
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
    ct === null ? fr = ct = this : (ct.next = this, this.prev = ct), ct = this;
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
        V(a, O), r(a);
      for (a of n.m)
        V(a, _e), r(a);
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
      if (!((i.f & te) !== 0 || (i.f & (O | _e)) === 0)) {
        for (var r = i, n = !1; r.parent !== null; ) {
          r = r.parent;
          var a = r.f;
          if ((a & (We | Se)) !== 0) {
            if ((a & K) === 0) {
              n = !0;
              break;
            }
            r.f ^= K;
          }
        }
        n || t.push(r);
      }
    return this.#n = [], t;
  }
  #_() {
    this.started = !0;
    for (const [l, o] of this.#a)
      V(l, o), this.schedule(l);
    this.apply();
    for (var t = It = [], r = [], n = Xt = []; this.#n.length > 0; ) {
      Vr++ > 1e3 && (this.#v(), Ba());
      for (const l of this.#u())
        try {
          this.#k(l, t, r);
        } catch (o) {
          throw Cn(l), this.#d() || this.discard(), o;
        }
    }
    if (M = null, n.length > 0) {
      var a = Ke.ensure();
      for (const l of n)
        a.schedule(l);
    }
    if (It = null, Xt = null, this.#d()) {
      this.#p(r), this.#p(t);
      for (const [l, o] of this.#l)
        En(l, o);
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
    this.#t.clear(), gt = this, Hr(r), Hr(t), gt = null, this.#r?.resolve();
    var s = (
      /** @type {Batch | null} */
      /** @type {unknown} */
      M
    );
    this.#e === 0 && (this.#n.length === 0 || s !== null) && this.#v(), s !== null && (qe.clear(), s.#_());
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #k(t, r, n) {
    t.f ^= K;
    for (var a = t.first; a !== null; ) {
      var i = a.f, s = (i & (Se | We)) !== 0, l = s && (i & K) !== 0, o = l || (i & se) !== 0 || this.#l.has(a);
      if (!o && a.fn !== null) {
        s ? a.f ^= K : (i & kt) !== 0 ? r.push(a) : Gt(a) && ((i & Me) !== 0 && this.add_dirty_reaction(a, _e), Mt(a));
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
      if (a !== null && !((n.f & ae) !== 0 && (n.f & (O | _e)) === 0))
        for (const l of a) {
          var i = l.f;
          if ((i & ae) !== 0)
            r(
              /** @type {Derived} */
              l
            );
          else {
            var s = (
              /** @type {Effect} */
              l
            );
            i & (_t | Me) && !this.async_deriveds.has(s) && (this.#a.delete(s), V(s, O), this.schedule(s));
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
      gn(t[r], this.#a);
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Value} source
   * @param {any} value
   * @param {boolean} [is_derived]
   */
  capture(t, r, n = !1) {
    t.v !== W && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & Ge) === 0 && (this.current.set(t, [r, n]), Ee?.set(t, r)), this.is_fork || (t.v = r);
  }
  activate() {
    M = this;
  }
  deactivate() {
    M = null, Ee = null;
  }
  flush() {
    try {
      ur = !0, M = this, this.#_();
    } finally {
      Vr = 0, wr = null, It = null, Xt = null, ur = !1, M = null, Ee = null, qe.clear();
    }
  }
  discard() {
    for (const t of this.#o) t(this);
    this.#o.clear();
    for (const t of this.async_deriveds.values())
      t.reject(qt);
    this.#v(), this.#r?.resolve();
  }
  /**
   * @param {Effect} effect
   */
  register_created_effect(t) {
    this.#i.push(t);
  }
  #w() {
    for (let v = fr; v !== null; v = v.next) {
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
                (h.f & (Me | _t)) !== 0 ? v.schedule(h) : v.#p([h]);
              });
          v.activate();
          var s = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Map();
          for (var o of r)
            Mn(o, i, s, l);
          l = /* @__PURE__ */ new Map();
          var u = [...v.current].filter(([_, h]) => {
            const p = this.current.get(_);
            return p ? p[0] !== h[0] || p[1] !== h[1] : !0;
          }).map(([_]) => _);
          if (u.length > 0)
            for (const _ of this.#i)
              (_.f & (te | se | Qt)) === 0 && Rr(_, u, l) && ((_.f & (_t | Me)) !== 0 ? (V(_, O), v.schedule(_)) : v.add_dirty_reaction(_, O));
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
    (r === O || this.#a.get(t) !== O) && this.#a.set(t, r);
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
    return (this.#r ??= an()).promise;
  }
  static ensure() {
    if (M === null) {
      const t = M = new Ke();
      !ur && !Ot && Ye(() => {
        t.started || t.flush();
      });
    }
    return M;
  }
  apply() {
    {
      Ee = null;
      return;
    }
  }
  /**
   *
   * @param {Effect} effect
   */
  schedule(t) {
    if (wr = t, t.b?.is_pending && (t.f & (kt | sr | sn)) !== 0 && (t.f & Ct) === 0) {
      t.b.defer_effect(t);
      return;
    }
    this.#n.push(t);
  }
  #v() {
    if (this.linked) {
      var t = this.prev, r = this.next;
      t === null ? fr = r : t.next = r, r === null ? ct = t : r.prev = t, this.linked = !1;
    }
  }
}
function Ha(e) {
  var t = Ot, r = gt;
  gt = null, Ot = !0;
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
    Ot = t, gt = r;
  }
}
function Ba() {
  try {
    Sa();
  } catch (e) {
    Te(e, wr);
  }
}
let Oe = null;
function Hr(e) {
  var t = e.length;
  if (t !== 0) {
    for (var r = 0; r < t; ) {
      var n = e[r++];
      if ((n.f & (te | se)) === 0 && Gt(n) && (Oe = /* @__PURE__ */ new Set(), Mt(n), n.deps === null && n.first === null && n.nodes === null && n.teardown === null && n.ac === null && Dn(n), Oe?.size > 0)) {
        qe.clear();
        for (const a of Oe) {
          if ((a.f & (te | se)) !== 0) continue;
          const i = [a];
          let s = a.parent;
          for (; s !== null; )
            Oe.has(s) && (Oe.delete(s), i.push(s)), s = s.parent;
          for (let l = i.length - 1; l >= 0; l--) {
            const o = i[l];
            (o.f & (te | se)) === 0 && Mt(o);
          }
        }
        Oe.clear();
      }
    }
    Oe = null;
  }
}
function Mn(e, t, r, n) {
  if (!r.has(e) && (r.add(e), e.reactions !== null))
    for (const a of e.reactions) {
      const i = a.f;
      (i & ae) !== 0 ? Mn(
        /** @type {Derived} */
        a,
        t,
        r,
        n
      ) : (i & (_t | Me)) !== 0 && (i & O) === 0 && Rr(a, t, n) && (V(a, O), Nr(
        /** @type {Effect} */
        a
      ));
    }
}
function Rr(e, t, r) {
  const n = r.get(e);
  if (n !== void 0) return n;
  if (e.deps !== null)
    for (const a of e.deps) {
      if (jt.call(t, a))
        return !0;
      if ((a.f & ae) !== 0 && Rr(
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
function Nr(e) {
  M.schedule(e);
}
function En(e, t) {
  if (!((e.f & Se) !== 0 && (e.f & K) !== 0)) {
    (e.f & O) !== 0 ? t.d.push(e) : (e.f & _e) !== 0 && t.m.push(e), V(e, K);
    for (var r = e.first; r !== null; )
      En(r, t), r = r.next;
  }
}
function Cn(e) {
  V(e, K);
  for (var t = e.first; t !== null; )
    Cn(t), t = t.next;
}
let tr = /* @__PURE__ */ new Set();
const qe = /* @__PURE__ */ new Map();
let xn = !1;
function at(e, t) {
  var r = {
    f: 0,
    v: e,
    reactions: null,
    equals: vn,
    rv: 0,
    wv: 0
  };
  return r;
}
// @__NO_SIDE_EFFECTS__
function ee(e, t) {
  const r = at(e);
  return Fn(r), r;
}
// @__NO_SIDE_EFFECTS__
function Ua(e, t = !1, r = !0) {
  const n = at(e);
  return t || (n.equals = hn), n;
}
function B(e, t, r = !1) {
  S !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!Ce || (S.f & Qt) !== 0) && _n() && (S.f & (ae | Me | _t | Qt)) !== 0 && (Re === null || !Re.has(e)) && qa();
  let n = r ? Qe(t) : t;
  return bt(e, n, Xt);
}
var Xe = null, yr = 0;
function bt(e, t, r = null) {
  if (!e.equals(t)) {
    De ? qe.set(e, t) : qe.has(e) || qe.set(e, e.v);
    var n = Ke.ensure();
    if (n.capture(e, t), (e.f & ae) !== 0) {
      const a = (
        /** @type {Derived} */
        e
      );
      (e.f & O) !== 0 && qr(a), Ee === null && zr(a);
    }
    e.wv = Hn(), Xe = null, yr = 0, Sn(e, O, r), Xe = null, q !== null && (q.f & K) !== 0 && (q.f & (Se | We)) === 0 && (pe === null ? ai([e]) : pe.push(e)), !n.is_fork && tr.size > 0 && !xn && Ya();
  }
  return t;
}
function Ya() {
  xn = !1;
  for (const e of tr) {
    (e.f & K) !== 0 && V(e, _e);
    let t;
    try {
      t = Gt(e);
    } catch {
      t = !0;
    }
    t && Mt(e);
  }
  tr.clear();
}
function Lt(e) {
  B(e, e.v + 1);
}
function Sn(e, t, r) {
  var n = e.reactions;
  if (n !== null) {
    var a = n.length;
    if (yr += a, yr > 1e5 && Xe === null && (Xe = /* @__PURE__ */ new Set()), Xe !== null) {
      if (Xe.has(e)) return;
      Xe.add(e);
    }
    for (var i = 0; i < a; i++) {
      var s = n[i], l = s.f, o = (l & O) === 0;
      if (o && V(s, t), (l & Qt) !== 0)
        tr.add(
          /** @type {Effect} */
          s
        );
      else if ((l & ae) !== 0) {
        var u = (
          /** @type {Derived} */
          s
        );
        Ee?.delete(u), Sn(u, _e, r);
      } else if (o) {
        var c = (
          /** @type {Effect} */
          s
        );
        (l & Me) !== 0 && Oe !== null && Oe.add(c), r !== null ? r.push(c) : Nr(c);
      }
    }
  }
}
function Qe(e) {
  if (typeof e != "object" || e === null || pt in e || ln in e)
    return e;
  const t = nn(e);
  if (t !== ea && t !== ta)
    return e;
  var r = /* @__PURE__ */ new Map(), n = ar(e), a = /* @__PURE__ */ ee(0), i = tt, s = (l) => {
    if (tt === i)
      return l();
    var o = S, u = tt;
    ke(null), Gr(i);
    var c = l();
    return ke(o), Gr(u), c;
  };
  return n && r.set("length", /* @__PURE__ */ ee(
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
          var v = /* @__PURE__ */ ee(u.value);
          return r.set(o, v), v;
        }) : B(c, u.value, !0), !0;
      },
      deleteProperty(l, o) {
        var u = r.get(o);
        if (u === void 0) {
          if (o in l) {
            const c = s(() => /* @__PURE__ */ ee(W));
            r.set(o, c), Lt(a);
          }
        } else
          B(u, W), Lt(a);
        return !0;
      },
      get(l, o, u) {
        if (o === pt)
          return e;
        var c = r.get(o), v = o in l;
        if (c === void 0 && (!v || dt(l, o)?.writable) && (c = s(() => {
          var h = Qe(v ? l[o] : W), p = /* @__PURE__ */ ee(h);
          return p;
        }), r.set(o, c)), c !== void 0) {
          var _ = g(c);
          return _ === W ? void 0 : _;
        }
        return Reflect.get(l, o, u);
      },
      getOwnPropertyDescriptor(l, o) {
        this.has?.(l, o);
        var u = Reflect.getOwnPropertyDescriptor(l, o), c = r.get(o);
        if (c !== void 0) {
          var v = g(c);
          if (v === W)
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
        if (o === pt)
          return !0;
        var u = r.get(o), c = u !== void 0 && u.v !== W || Reflect.has(l, o);
        if (u !== void 0 || (q !== null || S !== null) && (!c || dt(l, o)?.writable)) {
          u === void 0 && (u = s(() => {
            var _ = c ? Qe(l[o]) : W, h = /* @__PURE__ */ ee(_);
            return h;
          }), r.set(o, u));
          var v = g(u);
          if (v === W)
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
            p !== void 0 ? B(p, W) : h in l && (p = s(() => /* @__PURE__ */ ee(W)), r.set(h + "", p));
          }
        if (v === void 0)
          (!_ || dt(l, o)?.writable) && (v = s(() => /* @__PURE__ */ ee(void 0)), B(v, Qe(u)), r.set(o, v));
        else {
          _ = v.v !== W;
          var w = s(() => Qe(u));
          B(v, w);
        }
        var m = Reflect.getOwnPropertyDescriptor(l, o);
        if (m?.set && m.set.call(c, u), !_) {
          if (n && typeof o == "string") {
            var y = (
              /** @type {Source<number>} */
              r.get("length")
            ), x = Number(o);
            Number.isInteger(x) && x >= y.v && B(y, x + 1);
          }
          Lt(a);
        }
        return !0;
      },
      ownKeys(l) {
        g(a);
        var o = Reflect.ownKeys(l).filter((v) => {
          var _ = r.get(v);
          return _ === void 0 || _.v !== W;
        });
        for (var [u, c] of r)
          c.v !== W && !(u in l) && o.push(u);
        return o;
      },
      setPrototypeOf() {
        za();
      }
    }
  );
}
function Br(e) {
  try {
    if (e !== null && typeof e == "object" && pt in e)
      return e[pt];
  } catch {
  }
  return e;
}
function An(e, t) {
  return Object.is(Br(e), Br(t));
}
var Ur, Tn, zn, qn;
function Ga() {
  if (Ur === void 0) {
    Ur = window, Tn = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, r = Text.prototype;
    zn = dt(t, "firstChild").get, qn = dt(t, "nextSibling").get, Pr(e) && (e[gr] = void 0, e[on] = null, e[mr] = void 0, e.__e = void 0), Pr(r) && (r[kr] = void 0);
  }
}
function Le(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function Ae(e) {
  return (
    /** @type {TemplateNode | null} */
    zn.call(e)
  );
}
// @__NO_SIDE_EFFECTS__
function Yt(e) {
  return (
    /** @type {TemplateNode | null} */
    qn.call(e)
  );
}
function z(e, t) {
  return /* @__PURE__ */ Ae(e);
}
function Ue(e, t = !1) {
  {
    var r = /* @__PURE__ */ Ae(e);
    return r instanceof Comment && r.data === "" ? /* @__PURE__ */ Yt(r) : r;
  }
}
function F(e, t = !1) {
  return /* @__PURE__ */ Ae(e);
}
function E(e, t = 1, r = !1) {
  let n = e;
  for (; t--; )
    n = /** @type {TemplateNode} */
    /* @__PURE__ */ Yt(n);
  return n;
}
function Wa(e) {
  e.textContent = "";
}
function Rn() {
  return !1;
}
function Ka(e, t, r) {
  return (
    /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
    r ? document.createElement(e, { is: r }) : document.createElement(e)
  );
}
function Za(e) {
  var t = q;
  if (t === null)
    return S.f |= Ge, e;
  if ((t.f & Ct) === 0 && (t.f & kt) === 0)
    throw e;
  Te(e, t);
}
function Te(e, t) {
  if (e === cn)
    throw e;
  if (!(t !== null && (t.f & te) !== 0)) {
    for (; t !== null; ) {
      if ((t.f & pr) !== 0 && (t.f & (te | Jt)) === 0) {
        if ((t.f & Ct) === 0)
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
  q === null && (S === null && xa(), Ca()), De && Ea();
}
function Ja(e, t) {
  var r = t.last;
  r === null ? t.last = t.first = e : (r.next = e, e.prev = r, t.last = e);
}
function je(e, t) {
  var r = q;
  r !== null && (r.f & se) !== 0 && (e |= se);
  var n = {
    ctx: ue,
    deps: null,
    nodes: null,
    f: e | O | xe,
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
  if ((e & kt) !== 0)
    It !== null ? It.push(n) : Ke.ensure().schedule(n);
  else if (t !== null) {
    try {
      Mt(n);
    } catch (s) {
      throw ce(n), s;
    }
    a.deps === null && a.teardown === null && a.nodes === null && a.first === a.last && // either `null`, or a singular child
    (a.f & xt) === 0 && (a = a.first, (e & Me) !== 0 && (e & wt) !== 0 && a !== null && (a.f |= wt));
  }
  if (a !== null && (a.parent = r, r !== null && Ja(a, r), S !== null && (S.f & ae) !== 0 && (e & We) === 0)) {
    var i = (
      /** @type {Derived} */
      S
    );
    (i.effects ??= []).push(a);
  }
  return n;
}
function Or() {
  return S !== null && !Ce;
}
function Nn(e) {
  const t = je(sr, null);
  return V(t, K), t.teardown = e, t;
}
function Qa(e) {
  Xa();
  var t = (
    /** @type {Effect} */
    q.f
  ), r = !S && (t & Se) !== 0 && ue !== null && !ue.i;
  if (r) {
    var n = (
      /** @type {ComponentContext} */
      ue
    );
    (n.e ??= []).push(e);
  } else
    return On(e);
}
function On(e) {
  return je(kt | ia, e);
}
function $a(e) {
  Ke.ensure();
  const t = je(We | xt, e);
  return (r = {}) => new Promise((n) => {
    r.outro ? et(t, () => {
      ce(t), n(void 0);
    }) : (ce(t), n(void 0));
  });
}
function ei(e) {
  return je(kt, e);
}
function ti(e) {
  return je(_t | xt, e);
}
function In(e, t = 0) {
  return je(sr | t, e);
}
function U(e, t = [], r = [], n = []) {
  La(n, t, r, (a) => {
    je(sr, () => {
      e(...a.map(g));
    });
  });
}
function lr(e, t = 0) {
  var r = je(Me | t, e);
  return r;
}
function ge(e) {
  return je(Se | xt, e);
}
function Ln(e) {
  var t = e.teardown;
  if (t !== null) {
    const r = De, n = S;
    Yr(!0), ke(null);
    try {
      t.call(null);
    } catch (a) {
      Te(a, e.parent);
    } finally {
      Yr(r), ke(n);
    }
  }
}
function Ir(e, t = !1) {
  var r = e.first;
  for (e.first = e.last = null; r !== null; ) {
    const a = r.ac;
    a !== null && Ut(() => {
      a.abort(Vt);
    });
    var n = r.next;
    (r.f & We) !== 0 ? r.parent = null : ce(r, t), r = n;
  }
}
function ri(e) {
  for (var t = e.first; t !== null; ) {
    var r = t.next;
    (t.f & Se) === 0 && ce(t), t = r;
  }
}
function ce(e, t = !0) {
  var r = !1;
  (t || (e.f & aa) !== 0) && e.nodes !== null && e.nodes.end !== null && (ni(
    e.nodes.start,
    /** @type {TemplateNode} */
    e.nodes.end
  ), r = !0), e.f |= Jt, Ir(e, t && !r), Ft(e, 0);
  var n = e.nodes && e.nodes.t;
  if (n !== null)
    for (const i of n)
      i.stop();
  Ln(e), e.f ^= Jt, e.f |= te;
  var a = e.parent;
  a !== null && a.first !== null && Dn(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function ni(e, t) {
  for (; e !== null; ) {
    var r = e === t ? null : /* @__PURE__ */ Yt(e);
    e.remove(), e = r;
  }
}
function Dn(e) {
  var t = e.parent, r = e.prev, n = e.next;
  r !== null && (r.next = n), n !== null && (n.prev = r), t !== null && (t.first === e && (t.first = n), t.last === e && (t.last = r));
}
function et(e, t, r = !0) {
  var n = [];
  e.f |= Tr, jn(e, n, !0);
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
function jn(e, t, r) {
  if ((e.f & se) === 0) {
    e.f ^= se;
    var n = e.nodes && e.nodes.t;
    if (n !== null)
      for (const l of n)
        (l.is_global || r) && t.push(l);
    for (var a = e.first; a !== null; ) {
      var i = a.next;
      if ((a.f & We) === 0) {
        var s = (a.f & wt) !== 0 || // If this is a branch effect without a block effect parent,
        // it means the parent block effect was pruned. In that case,
        // transparency information was transferred to the branch effect.
        (a.f & Se) !== 0 && (e.f & Me) !== 0;
        jn(a, t, s ? r : !1);
      }
      a = i;
    }
  }
}
function rr(e) {
  e.f &= ~Tr, Pn(e, !0);
}
function Pn(e, t) {
  if ((e.f & Tr) === 0 && (e.f & se) !== 0) {
    e.f ^= se, (e.f & K) === 0 && (V(e, O), Ke.ensure().schedule(e));
    for (var r = e.first; r !== null; ) {
      var n = r.next, a = (r.f & wt) !== 0 || (r.f & Se) !== 0;
      Pn(r, a ? t : !1), r = n;
    }
    var i = e.nodes && e.nodes.t;
    if (i !== null)
      for (const s of i)
        (s.is_global || t) && s.in();
  }
}
function Lr(e, t) {
  if (e.nodes)
    for (var r = e.nodes.start, n = e.nodes.end; r !== null; ) {
      var a = r === n ? null : /* @__PURE__ */ Yt(r);
      t.append(r), r = a;
    }
}
let De = !1;
function Yr(e) {
  De = e;
}
let S = null, Ce = !1;
function ke(e) {
  S = e;
}
let q = null;
function Ne(e) {
  q = e;
}
let Re = null;
function Fn(e) {
  S !== null && ((S.f & $t) !== 0 || (S.f & ae) !== 0) && (Re ??= /* @__PURE__ */ new Set()).add(e);
}
let fe = null, de = 0, pe = null;
function ai(e) {
  pe = e;
}
let Vn = 1, $e = 0, tt = $e;
function Gr(e) {
  tt = e;
}
function Hn() {
  return ++Vn;
}
function Gt(e) {
  var t = e.f;
  if ((t & O) !== 0)
    return !0;
  if ((t & _e) !== 0) {
    for (var r = (
      /** @type {Value[]} */
      e.deps
    ), n = r.length, a = 0; a < n; a++) {
      var i = r[a];
      if (Gt(
        /** @type {Derived} */
        i
      ) && yn(
        /** @type {Derived} */
        i
      ), i.wv > e.wv)
        return !0;
    }
    (t & xe) !== 0 && // During time traveling we don't want to reset the status so that
    // traversal of the graph in the other batches still happens
    Ee === null && V(e, K);
  }
  return !1;
}
function Bn(e, t, r = !0) {
  var n = e.reactions;
  if (n !== null && !(Re !== null && Re.has(e)))
    for (var a = 0; a < n.length; a++) {
      var i = n[a];
      (i.f & ae) !== 0 ? Bn(
        /** @type {Derived} */
        i,
        t,
        !1
      ) : t === i && (r ? V(i, O) : (i.f & K) !== 0 && V(i, _e), Nr(
        /** @type {Effect} */
        i
      ));
    }
}
function Un(e) {
  var t = fe, r = de, n = pe, a = S, i = Re, s = ue, l = Ce, o = tt, u = e.f;
  fe = /** @type {null | Value[]} */
  null, de = 0, pe = null, S = (u & (Se | We)) === 0 ? e : null, Re = null, yt(e.ctx), Ce = !1, tt = ++$e, e.ac !== null && (Ut(() => {
    e.ac.abort(Vt);
  }), e.ac = null);
  try {
    e.f |= $t;
    var c = (
      /** @type {Function} */
      e.fn
    ), v = c();
    e.f |= Ct;
    var _ = Wr(e);
    if (_n() && pe !== null && !Ce && _ !== null && (e.f & (ae | _e | O)) === 0)
      for (var h = 0; h < /** @type {Source[]} */
      pe.length; h++)
        Bn(
          pe[h],
          /** @type {Effect} */
          e
        );
    if (a !== null && a !== e) {
      if ($e++, a.deps !== null)
        for (let p = 0; p < r; p += 1)
          a.deps[p].rv = $e;
      if (t !== null)
        for (const p of t)
          p.rv = $e;
      pe !== null && (n === null ? n = pe : n.push(.../** @type {Source[]} */
      pe));
    }
    return (e.f & Ge) !== 0 && (e.f ^= Ge), v;
  } catch (p) {
    return Wr(e), Za(p);
  } finally {
    e.f ^= $t, fe = t, de = r, pe = n, S = a, Re = i, yt(s), Ce = l, tt = o;
  }
}
function Wr(e) {
  var t = e.deps, r = M?.is_fork;
  if (fe !== null) {
    var n;
    if (r || Ft(e, de), t !== null && de > 0)
      for (t.length = de + fe.length, n = 0; n < fe.length; n++)
        t[de + n] = fe[n];
    else
      e.deps = t = fe;
    if (Or() && (e.f & xe) !== 0)
      for (n = de; n < t.length; n++)
        (t[n].reactions ??= []).push(e);
  } else !r && t !== null && de < t.length && (Ft(e, de), t.length = de);
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
  if (r === null && (t.f & ae) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (fe === null || !jt.call(fe, t))) {
    var i = (
      /** @type {Derived} */
      t
    );
    (i.f & xe) !== 0 && (i.f ^= xe), i.v !== W && zr(i), i.ac !== null && Ut(() => {
      i.ac.abort(Vt), i.ac = null, V(i, O);
    }), Fa(i), Ft(i, 0);
  }
}
function Ft(e, t) {
  var r = e.deps;
  if (r !== null)
    for (var n = t; n < r.length; n++)
      ii(e, r[n]);
}
function Mt(e) {
  var t = e.f;
  if ((t & te) === 0) {
    V(e, K);
    var r = q;
    q = e;
    try {
      (t & (Me | sn)) !== 0 ? ri(e) : Ir(e), Ln(e);
      var n = Un(e);
      e.teardown = typeof n == "function" ? n : null, e.wv = Vn;
      var a;
    } finally {
      q = r;
    }
  }
}
async function si() {
  await Promise.resolve(), Ha();
}
function g(e) {
  var t = e.f, r = (t & ae) !== 0;
  if (S !== null && !Ce) {
    var n = q !== null && (q.f & te) !== 0;
    if (!n && (Re === null || !Re.has(e))) {
      var a = S.deps;
      if ((S.f & $t) !== 0)
        e.rv < $e && (e.rv = $e, fe === null && a !== null && a[de] === e ? de++ : fe === null ? fe = [e] : fe.push(e));
      else {
        S.deps ??= [], jt.call(S.deps, e) || S.deps.push(e);
        var i = e.reactions;
        i === null ? e.reactions = [S] : jt.call(i, S) || i.push(S);
      }
    }
  }
  if (De && qe.has(e))
    return qe.get(e);
  if (r) {
    var s = (
      /** @type {Derived} */
      e
    );
    if (De) {
      var l = s.v;
      return ((s.f & K) === 0 && s.reactions !== null || Gn(s)) && (l = qr(s)), qe.set(s, l), l;
    }
    var o = (s.f & xe) === 0 && !Ce && S !== null && (S.f & xe) !== 0, u = (s.f & Ct) === 0;
    Gt(s) && (o && (s.f |= xe), yn(s)), o && !u && (bn(s), Yn(s));
  }
  if (Ee?.has(e))
    return Ee.get(e);
  if ((e.f & Ge) !== 0)
    throw e.v;
  return e.v;
}
function Yn(e) {
  if (e.f |= xe, e.deps !== null)
    for (const r of e.deps) {
      var t = r.reactions;
      t === null ? r.reactions = [e] : jt.call(t, e) || t.push(e), (r.f & ae) !== 0 && (r.f & xe) === 0 && (bn(
        /** @type {Derived} */
        r
      ), Yn(
        /** @type {Derived} */
        r
      ));
    }
}
function Gn(e) {
  if (e.v === W) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (qe.has(t) || (t.f & ae) !== 0 && Gn(
      /** @type {Derived} */
      t
    ))
      return !0;
  return !1;
}
function Dr(e) {
  var t = Ce;
  try {
    return Ce = !0, e();
  } finally {
    Ce = t;
  }
}
const li = ["touchstart", "touchmove"];
function oi(e) {
  return li.includes(e);
}
const Rt = /* @__PURE__ */ Symbol("events"), Wn = /* @__PURE__ */ new Set(), br = /* @__PURE__ */ new Set();
function Ie(e, t, r) {
  (t[Rt] ??= {})[e] = r;
}
function jr(e) {
  for (var t = 0; t < e.length; t++)
    Wn.add(e[t]);
  for (var r of br)
    r(e);
}
let cr = null, vr = !1;
function Kr(e) {
  var t = this, r = (
    /** @type {Node} */
    t.ownerDocument
  ), n = e.type, a = e.composedPath?.() || [], i = (
    /** @type {null | Element} */
    a[0] || e.target
  );
  cr = e, vr || (vr = !0, setTimeout(() => {
    vr = !1, cr = null;
  }));
  var s = 0, l = cr === e && e[Rt];
  if (l) {
    var o = a.indexOf(l);
    if (o !== -1 && (t === document || t === /** @type {any} */
    window)) {
      e[Rt] = t;
      return;
    }
    var u = a.indexOf(t);
    if (u === -1)
      return;
    o <= u && (s = o);
  }
  if (i = /** @type {Element} */
  a[s] || e.target, i !== t) {
    rn(e, "currentTarget", {
      configurable: !0,
      get() {
        return i || r;
      }
    });
    var c = S, v = q;
    ke(null), Ne(null);
    try {
      for (var _, h = []; i !== null && i !== t; ) {
        try {
          var p = i[Rt]?.[n];
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
      e[Rt] = t, delete e.currentTarget, ke(c), Ne(v);
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
function Kn(e) {
  var t = Ka("template");
  return t.innerHTML = ui(e.replaceAll("<!>", "<!---->")), t.content;
}
function Et(e, t) {
  var r = (
    /** @type {Effect} */
    q
  );
  r.nodes === null && (r.nodes = { start: e, end: t, a: null, t: null });
}
// @__NO_SIDE_EFFECTS__
function Q(e, t) {
  var r = (t & un) !== 0, n = (t & pa) !== 0, a, i = !e.startsWith("<!>");
  return () => {
    a === void 0 && (a = Kn(i ? e : "<!>" + e), r || (a = /** @type {TemplateNode} */
    /* @__PURE__ */ Ae(a)));
    var s = (
      /** @type {TemplateNode} */
      n || Tn ? document.importNode(a, !0) : a.cloneNode(!0)
    );
    if (r) {
      var l = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Ae(s)
      ), o = (
        /** @type {TemplateNode} */
        s.lastChild
      );
      Et(l, o);
    } else
      Et(s, s);
    return s;
  };
}
// @__NO_SIDE_EFFECTS__
function ci(e, t, r = "svg") {
  var n = !e.startsWith("<!>"), a = (t & un) !== 0, i = `<${r}>${n ? e : "<!>" + e}</${r}>`, s;
  return () => {
    if (!s) {
      var l = (
        /** @type {DocumentFragment} */
        Kn(i)
      ), o = (
        /** @type {Element} */
        /* @__PURE__ */ Ae(l)
      );
      if (a)
        for (s = document.createDocumentFragment(); /* @__PURE__ */ Ae(o); )
          s.appendChild(
            /** @type {TemplateNode} */
            /* @__PURE__ */ Ae(o)
          );
      else
        s = /** @type {Element} */
        /* @__PURE__ */ Ae(o);
    }
    var u = (
      /** @type {TemplateNode} */
      s.cloneNode(!0)
    );
    if (a) {
      var c = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Ae(u)
      ), v = (
        /** @type {TemplateNode} */
        u.lastChild
      );
      Et(c, v);
    } else
      Et(u, u);
    return u;
  };
}
// @__NO_SIDE_EFFECTS__
function b(e, t) {
  return /* @__PURE__ */ ci(e, t, "svg");
}
function Zr(e = "") {
  {
    var t = Le(e + "");
    return Et(t, t), t;
  }
}
function vi() {
  var e = document.createDocumentFragment(), t = document.createComment(""), r = Le();
  return e.append(t, r), Et(t, r), e;
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
    Or() && (g(r), In(() => (t === 0 && (n = Dr(() => e(() => Lt(r)))), t += 1, () => {
      Ye(() => {
        t -= 1, t === 0 && (n?.(), n = void 0, Lt(r));
      });
    })));
  };
}
var _i = wt | xt;
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
        q
      );
      s.b = this, s.f |= pr, n(i);
    }, this.parent = /** @type {Effect} */
    q.b, this.transform_error = a ?? this.parent?.transform_error ?? ((i) => i), this.#r = lr(() => {
      this.#w();
    }, _i);
  }
  #k() {
    try {
      this.#n = ge(() => this.#s(this.#t));
    } catch (t) {
      this.error(t);
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #b(t) {
    const r = this.#e.failed, { reset: n, invoke_onerror: a } = this.#m(t);
    Ye(a), r && (this.#a = ge(() => {
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
        r = !0, n && Ra(), this.#a !== null && et(this.#a, () => {
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
          Te(s, this.#r && this.#r.parent);
        }
    } };
  }
  #c() {
    return (this.#r.f & (te | Jt)) !== 0;
  }
  #p() {
    const t = this.#e.pending;
    t && (this.is_pending = !0, this.#i = ge(() => t(this.#t)), Ye(() => {
      if (!this.#c()) {
        var r = this.#l = document.createDocumentFragment(), n = Le(), a = !1;
        if (r.append(n), this.#n = this.#y(() => {
          try {
            return ge(() => this.#s(n));
          } catch (i) {
            try {
              this.error(i), a = !0;
            } catch (s) {
              Te(s, this.#r.parent);
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
        this.#f === 0 && (this.#t.before(r), this.#l = null, et(
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
      if (this.is_pending = this.has_pending_snippet(), this.#f = 0, this.#h = 0, this.#n = ge(() => {
        this.#s(this.#t);
      }), this.#f > 0) {
        var t = this.#l = document.createDocumentFragment();
        Lr(this.#n, t);
        const r = (
          /** @type {(anchor: Node) => void} */
          this.#e.pending
        );
        this.#i = ge(() => r(this.#t));
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
    gn(t, this.#g);
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
    var r = q, n = S, a = ue;
    Ne(this.#r), ke(this.#r), yt(this.#r.ctx);
    try {
      return Ke.ensure(), t();
    } finally {
      Ne(r), ke(n), yt(a);
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
    this.#f += t, this.#f === 0 && (this.#v(r), this.#i && et(this.#i, () => {
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
      this.#d = !1, this.#u && bt(this.#u, this.#h);
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
    if (t === cn || !this.#e.onerror && !this.#e.failed)
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
          return ge(() => {
            var l = (
              /** @type {Effect} */
              q
            );
            l.b = this, l.f |= pr, r(
              this.#t,
              () => a,
              () => i
            );
          });
        } catch (l) {
          return Te(
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
          Te(i, this.#r && this.#r.parent);
          return;
        }
        a !== null && typeof a == "object" && typeof /** @type {any} */
        a.then == "function" ? a.then(
          n,
          /** @param {unknown} e */
          (i) => Te(i, this.#r && this.#r.parent)
        ) : n(a);
      }
    });
  }
}
function R(e, t) {
  var r = t == null ? "" : typeof t == "object" ? `${t}` : t;
  r !== /** @type {any} */
  (e[kr] ??= e.nodeValue) && (e[kr] = r, e.nodeValue = `${r}`);
}
function mi(e, t) {
  return ki(e, t);
}
const Wt = /* @__PURE__ */ new Map();
function ki(e, { target: t, anchor: r, props: n = {}, events: a, context: i, intro: s = !0, transformError: l }) {
  Ga();
  var o = void 0, u = $a(() => {
    var c = r ?? t.appendChild(Le());
    pi(
      /** @type {TemplateNode} */
      c,
      {
        pending: () => {
        }
      },
      (h) => {
        Ht({});
        var p = (
          /** @type {ComponentContext} */
          ue
        );
        i && (p.c = i), a && (n.$$events = a), o = e(h, n) || dn(), Bt();
      },
      l
    );
    var v = /* @__PURE__ */ new Set(), _ = (h) => {
      for (var p = 0; p < h.length; p++) {
        var w = h[p];
        if (!v.has(w)) {
          v.add(w);
          var m = oi(w);
          for (const N of [t, document]) {
            var y = Wt.get(N);
            y === void 0 && (y = /* @__PURE__ */ new Map(), Wt.set(N, y));
            var x = y.get(w);
            x === void 0 ? (N.addEventListener(w, Kr, { passive: m }), y.set(w, 1)) : y.set(w, x + 1);
          }
        }
      }
    };
    return _(ir(Wn)), br.add(_), () => {
      for (var h of v)
        for (const m of [t, document]) {
          var p = (
            /** @type {Map<string, number>} */
            Wt.get(m)
          ), w = (
            /** @type {number} */
            p.get(h)
          );
          --w == 0 ? (m.removeEventListener(h, Kr), p.delete(h), p.size === 0 && Wt.delete(m)) : p.set(h, w);
        }
      br.delete(_), c !== r && c.parentNode?.removeChild(c);
    };
  });
  return Mr.set(o, u), o;
}
let Mr = /* @__PURE__ */ new WeakMap();
function wi(e, t) {
  const r = Mr.get(e);
  return r ? (Mr.delete(e), r(t)) : Promise.resolve();
}
class Zn {
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
        rr(n), this.#s.delete(r);
      else {
        var a = this.#e.get(r);
        a && (rr(a.effect), this.#o.set(r, a.effect), this.#e.delete(r), a.fragment.lastChild.remove(), this.anchor.before(a.fragment), n = a.effect);
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
            Lr(s, u), u.append(Le()), this.#e.set(i, { effect: s, fragment: u });
          } else
            ce(s);
          this.#s.delete(i), this.#o.delete(i);
        };
        this.#r || !n ? (this.#s.add(i), et(s, l, !1)) : l();
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
    ), a = Rn();
    if (r && !this.#o.has(t) && !this.#e.has(t))
      if (a) {
        var i = document.createDocumentFragment(), s = Le();
        i.append(s), this.#e.set(t, {
          effect: ge(() => r(s)),
          fragment: i
        });
      } else
        this.#o.set(
          t,
          ge(() => r(this.anchor))
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
function me(e, t, r = !1) {
  var n = new Zn(e), a = r ? wt : 0;
  function i(s, l) {
    n.ensure(s, l);
  }
  lr(() => {
    var s = !1;
    t((l, o = 0) => {
      s = !0, i(o, l);
    }), s || i(-1, null);
  }, a);
}
const yi = /* @__PURE__ */ Symbol("NaN");
function bi(e, t, r) {
  var n = new Zn(e);
  lr(() => {
    var a = t();
    a !== a && (a = /** @type {any} */
    yi), n.ensure(a, r);
  });
}
function Er(e, t) {
  return t;
}
function Mi(e, t, r) {
  for (var n = [], a = t.length, i, s = t.length, l = 0; l < a; l++) {
    let v = t[l];
    et(
      v,
      () => {
        if (i) {
          if (i.pending.delete(v), i.done.add(v), i.pending.size === 0) {
            var _ = (
              /** @type {Set<EachOutroGroup>} */
              e.outrogroups
            );
            Cr(e, ir(i.done)), _.delete(i), _.size === 0 && (e.outrogroups = null);
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
    Cr(e, t, !o);
  } else
    i = {
      pending: new Set(t),
      done: /* @__PURE__ */ new Set()
    }, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(i);
}
function Cr(e, t, r = !0) {
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
      i.f |= ze;
      const s = document.createDocumentFragment();
      Lr(i, s);
    } else
      ce(t[a], r);
  }
}
var Xr;
function vt(e, t, r, n, a, i = null) {
  var s = e, l = /* @__PURE__ */ new Map(), o = (t & fn) !== 0;
  if (o) {
    var u = (
      /** @type {Element} */
      e
    );
    s = u.appendChild(Le());
  }
  var c = null, v = /* @__PURE__ */ wn(() => {
    var x = r();
    return (
      /** @type {V[]} */
      ar(x) ? x : x == null ? [] : ir(x)
    );
  }), _ = /* @__PURE__ */ new Map(), h = !0;
  function p(x) {
    if ((y.effect.f & te) === 0) {
      y.pending.delete(x);
      var N = g(v);
      y.fallback = c, Ei(y, N, s, t, n), c !== null && (N.length === 0 ? (c.f & ze) === 0 ? rr(c) : (c.f ^= ze, Nt(c, null, s)) : et(c, () => {
        c = null;
      }));
    }
  }
  function w(x) {
    y.pending.delete(x);
  }
  var m = lr(() => {
    for (var x = (
      /** @type {V[]} */
      g(v)
    ), N = x.length, T = /* @__PURE__ */ new Set(), P = (
      /** @type {Batch} */
      M
    ), ie = Rn(), Y = 0; Y < N; Y += 1) {
      var le = x[Y], ve = n(le, Y), D = h ? null : l.get(ve);
      D ? (D.v && bt(D.v, le), D.i && bt(D.i, Y), ie && P.unskip_effect(D.e)) : (D = Ci(
        l,
        h ? s : Xr ??= Le(),
        le,
        ve,
        Y,
        a,
        t,
        r
      ), h || (D.e.f |= ze), l.set(ve, D)), T.add(ve);
    }
    if (N === 0 && i && !c && (h ? c = ge(() => i(s)) : (c = ge(() => i(Xr ??= Le())), c.f |= ze)), N > T.size && Ma(), !h)
      if (_.set(P, T), ie) {
        for (const [Pe, we] of l)
          T.has(Pe) || P.skip_effect(we.e);
        P.oncommit(p), P.ondiscard(w);
      } else
        p(P);
    g(v);
  }), y = { effect: m, items: l, pending: _, outrogroups: null, fallback: c };
  h = !1;
}
function zt(e) {
  for (; e !== null && (e.f & Se) === 0; )
    e = e.next;
  return e;
}
function Ei(e, t, r, n, a) {
  var i = (n & ua) !== 0, s = t.length, l = e.items, o = zt(e.effect.first), u, c = null, v, _ = [], h = [], p, w, m, y;
  if (i)
    for (y = 0; y < s; y += 1)
      p = t[y], w = a(p, y), m = /** @type {EachItem} */
      l.get(w).e, (m.f & ze) === 0 && (m.nodes?.a?.measure(), (v ??= /* @__PURE__ */ new Set()).add(m));
  for (y = 0; y < s; y += 1) {
    if (p = t[y], w = a(p, y), m = /** @type {EachItem} */
    l.get(w).e, e.outrogroups !== null)
      for (const D of e.outrogroups)
        D.pending.delete(m), D.done.delete(m);
    if ((m.f & se) !== 0 && (rr(m), i && (m.nodes?.a?.unfix(), (v ??= /* @__PURE__ */ new Set()).delete(m))), (m.f & ze) !== 0)
      if (m.f ^= ze, m === o)
        Nt(m, null, r);
      else {
        var x = c ? c.next : o;
        m === e.effect.last && (e.effect.last = m.prev), m.prev && (m.prev.next = m.next), m.next && (m.next.prev = m.prev), Be(e, c, m), Be(e, m, x), Nt(m, x, r), c = m, _ = [], h = [], o = zt(c.next);
        continue;
      }
    if (m !== o) {
      if (u !== void 0 && u.has(m)) {
        if (_.length < h.length) {
          var N = h[0], T;
          c = N.prev;
          var P = _[0], ie = _[_.length - 1];
          for (T = 0; T < _.length; T += 1)
            Nt(_[T], N, r);
          for (T = 0; T < h.length; T += 1)
            u.delete(h[T]);
          Be(e, P.prev, ie.next), Be(e, c, P), Be(e, ie, N), o = N, c = ie, y -= 1, _ = [], h = [];
        } else
          u.delete(m), Nt(m, o, r), Be(e, m.prev, m.next), Be(e, m, c === null ? e.effect.first : c.next), Be(e, c, m), c = m;
        continue;
      }
      for (_ = [], h = []; o !== null && o !== m; )
        (u ??= /* @__PURE__ */ new Set()).add(o), h.push(o), o = zt(o.next);
      if (o === null)
        continue;
    }
    (m.f & ze) === 0 && _.push(m), c = m, o = zt(m.next);
  }
  if (e.outrogroups !== null) {
    for (const D of e.outrogroups)
      D.pending.size === 0 && (Cr(e, ir(D.done)), e.outrogroups?.delete(D));
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (o !== null || u !== void 0) {
    var Y = [];
    if (u !== void 0)
      for (m of u)
        (m.f & se) === 0 && Y.push(m);
    for (; o !== null; )
      (o.f & se) === 0 && o !== e.fallback && Y.push(o), o = zt(o.next);
    var le = Y.length;
    if (le > 0) {
      var ve = (n & fn) !== 0 && s === 0 ? r : null;
      if (i) {
        for (y = 0; y < le; y += 1)
          Y[y].nodes?.a?.measure();
        for (y = 0; y < le; y += 1)
          Y[y].nodes?.a?.fix();
      }
      Mi(e, Y, ve);
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
    e: ge(() => (i(t, o ?? r, u ?? a, l), () => {
      e.delete(n);
    }))
  };
}
function Nt(e, t, r) {
  if (e.nodes)
    for (var n = e.nodes.start, a = e.nodes.end, i = t && (t.f & ze) === 0 ? (
      /** @type {EffectNodes} */
      t.nodes.start
    ) : r; n !== null; ) {
      var s = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Yt(n)
      );
      if (i.before(n), n === a)
        return;
      n = s;
    }
}
function Be(e, t, r) {
  t === null ? e.effect.first = r : t.next = r, r === null ? e.effect.last = t : r.prev = t;
}
const Jr = [...` 	
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
          (s === 0 || Jr.includes(n[s - 1])) && (l === n.length || Jr.includes(n[l])) ? n = (s === 0 ? "" : n.substring(0, s)) + n.substring(l + 1) : s = l;
        }
  }
  return n === "" ? null : n;
}
function Qr(e, t = !1) {
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
    return Array.isArray(t) ? (n = t[0], a = t[1]) : n = t, n && (r += Qr(n)), a && (r += Qr(a, !0)), r = r.trim(), r === "" ? null : r;
  }
  return String(e);
}
function rt(e, t, r, n, a, i) {
  var s = (
    /** @type {any} */
    e[gr]
  );
  if (s !== r || s === void 0) {
    var l = xi(r, n, i);
    l == null ? e.removeAttribute("class") : t ? e.className = l : e.setAttribute("class", l), e[gr] = r;
  } else if (i && a !== i)
    for (var o in i) {
      var u = !!i[o];
      (a == null || u !== !!a[o]) && e.classList.toggle(o, u);
    }
  return i;
}
function hr(e, t = {}, r, n) {
  for (var a in r) {
    var i = r[a];
    t[a] !== i && (r[a] == null ? e.style.removeProperty(a) : e.style.setProperty(a, i, n));
  }
}
function xr(e, t, r, n) {
  var a = (
    /** @type {any} */
    e[mr]
  );
  if (a !== t) {
    var i = Si(t, n);
    i == null ? e.removeAttribute("style") : e.style.cssText = i, e[mr] = t;
  } else n && (Array.isArray(n) ? (hr(e, r?.[0], n[0]), hr(e, r?.[1], n[1], "important")) : hr(e, r, n));
  return n;
}
function Ai(e, t) {
  t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function Ti(e, t) {
  var r = e.__defaultValue, n = e.multiple, a = n ? r ?? [] : null;
  if (!(n && !ar(a))) {
    e.selectedIndex;
    for (var i of e.options) {
      var s = mt(i);
      Ai(
        i,
        n ? (
          /** @type {any[]} */
          a.includes(s)
        ) : An(s, r)
      );
    }
  }
}
function Xn(e, t, r = !1) {
  if (e.multiple) {
    if (t == null)
      return;
    if (!ar(t))
      return ka();
    for (var n of e.options)
      n.selected = t.includes(mt(n));
    return;
  }
  for (n of e.options) {
    var a = mt(n);
    if (An(a, t)) {
      n.selected = !0;
      return;
    }
  }
  (!r || t !== void 0) && (e.selectedIndex = -1);
}
function zi(e) {
  var t = new MutationObserver((r) => {
    r.every(Ri) || ("__defaultValue" in e && Ti(e), "__value" in e && Xn(e, e.__value));
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
  }), Nn(() => {
    t.disconnect();
  });
}
function qi(e, t, r = t) {
  var n = /* @__PURE__ */ new WeakSet(), a = !0;
  mn(e, "change", (i) => {
    var s = i ? "[selected]" : ":checked", l;
    if (e.multiple)
      l = [].map.call(e.querySelectorAll(s), mt);
    else {
      var o = e.querySelector(s) ?? // will fall back to first non-disabled option if no option is selected
      e.querySelector("option:not([disabled])");
      l = o && mt(o);
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
    if (Xn(e, i, a), a && i === void 0) {
      var l = e.querySelector(":checked");
      l !== null && (i = mt(l), r(i));
    }
    e.__value = i, a = !1;
  });
}
function mt(e) {
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
function J(e, t, r, n) {
  var a = Ii(e), i = a[t];
  i !== (a[t] = r) && (t === "loading" && (e[la] = r), r == null ? e.removeAttribute(t) : typeof r != "string" && Li(e).has(t) ? e[t] = r : e.setAttribute(t, r));
}
function Ii(e) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    /** @type {any} */
    e[on] ??= {
      [Ni]: e.nodeName.includes("-"),
      [Oi]: e.namespaceURI === ga
    }
  );
}
var $r = /* @__PURE__ */ new Map();
function Li(e) {
  var t = e.getAttribute("is") || e.nodeName, r = $r.get(t);
  if (r) return r;
  $r.set(t, r = /* @__PURE__ */ new Set());
  for (var n, a = e, i = Element.prototype; i !== a; ) {
    n = $n(a);
    for (var s in n)
      n[s].set && // better safe than sorry, we don't want spread attributes to mess with HTML content
      s !== "innerHTML" && s !== "textContent" && s !== "innerText" && r.add(s);
    a = nn(a);
  }
  return r;
}
function Di(e, t, r = t) {
  var n = /* @__PURE__ */ new WeakSet();
  mn(e, "input", async (a) => {
    var i = a ? e.defaultValue : e.value;
    if (i = dr(e) ? _r(i) : i, r(i), M !== null && n.add(M), await si(), i !== (i = t())) {
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
  Dr(t) == null && e.value && (r(dr(e) ? _r(e.value) : e.value), M !== null && n.add(M)), In(() => {
    var a = t();
    if (e === document.activeElement) {
      var i = (
        /** @type {Batch} */
        M
      );
      if (n.has(i))
        return;
    }
    dr(e) && a === _r(e.value) || e.type === "date" && !a && !e.value || a !== e.value && (e.value = a ?? "");
  });
}
function dr(e) {
  var t = e.type;
  return t === "number" || t === "range";
}
function _r(e) {
  return e === "" ? null : +e;
}
let Kt = !1;
function ji(e) {
  var t = Kt;
  try {
    return Kt = !1, [e(), Kt];
  } finally {
    Kt = t;
  }
}
function nt(e, t, r, n) {
  var a = !0, i = (r & da) !== 0, s = (r & _a) !== 0, l = (
    /** @type {V} */
    n
  ), o = !0, u = (
    /** @type {Derived<V> | undefined} */
    void 0
  ), c = () => s && a ? (u ??= /* @__PURE__ */ Pt(
    /** @type {() => V} */
    n
  ), g(u)) : (o && (o = !1, l = s ? Dr(
    /** @type {() => V} */
    n
  ) : (
    /** @type {V} */
    n
  )), l);
  let v;
  if (i) {
    var _ = pt in e || sa in e;
    v = dt(e, t)?.set ?? (_ && t in e ? (T) => e[t] = T : void 0);
  }
  var h, p = !1;
  i ? [h, p] = ji(() => (
    /** @type {V} */
    e[t]
  )) : h = /** @type {V} */
  e[t], h === void 0 && n !== void 0 && (h = c(), v && (Aa(), v(h)));
  var w;
  if (w = () => {
    var T = (
      /** @type {V} */
      e[t]
    );
    return T === void 0 ? c() : (o = !0, T);
  }, (r & ha) === 0)
    return w;
  if (v) {
    var m = e.$$legacy;
    return (
      /** @type {() => V} */
      (function(T, P) {
        return arguments.length > 0 ? ((!P || m || p) && v(P ? w() : T), T) : w();
      })
    );
  }
  var y = !1, x = ((r & va) !== 0 ? Pt : wn)(() => (y = !1, w()));
  i && g(x);
  var N = (
    /** @type {Effect} */
    q
  );
  return (
    /** @type {() => V} */
    (function(T, P) {
      if (arguments.length > 0) {
        const ie = P ? g(x) : i ? Qe(T) : T;
        return B(x, ie), y = !0, l !== void 0 && (l = ie), T;
      }
      return De && y || (N.f & te) !== 0 ? x.v : g(x);
    })
  );
}
const Pi = "5";
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(Pi);
var Fi = /* @__PURE__ */ b('<path d="M6 3.2 10.8 8 6 12.8" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>'), Vi = /* @__PURE__ */ b('<path d="M3.2 6 8 10.8 12.8 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>'), Hi = /* @__PURE__ */ b('<path d="M10 3.2 5.2 8 10 12.8" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></path>'), Bi = /* @__PURE__ */ b('<path d="M1.5 4.2c0-.9.7-1.6 1.6-1.6h3.1l1.5 1.5h5.2c.9 0 1.6.7 1.6 1.6v6.4c0 .9-.7 1.6-1.6 1.6H3.1c-.9 0-1.6-.7-1.6-1.6z" fill="currentColor"></path><path d="M1.5 6.3h13" stroke="rgb(0 0 0 / 0.18)" stroke-width="0.8"></path>', 1), Ui = /* @__PURE__ */ b('<path d="M8 1.6l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path>'), Yi = /* @__PURE__ */ b('<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>'), Gi = /* @__PURE__ */ b('<path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#000" stroke-width="1.7" stroke-linecap="round"></path>'), Wi = /* @__PURE__ */ b('<path d="M4.9 8.3l2.1 2.1 4.1-4.6" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>'), Ki = /* @__PURE__ */ b('<path d="M6.4 5.2v5.6M9.6 5.2v5.6" stroke="#000" stroke-width="1.8" stroke-linecap="round"></path>'), Zi = /* @__PURE__ */ b('<path d="M4.8 8h6.4" stroke="#000" stroke-width="1.8" stroke-linecap="round"></path>'), Xi = /* @__PURE__ */ b('<path d="M8 4.6v6.2M5.4 8.4 8 11l2.6-2.6" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>'), Ji = /* @__PURE__ */ b('<circle cx="8" cy="6.2" r="2.4" fill="#000"></circle><path d="M3.4 12.6c1-1.9 2.7-2.8 4.6-2.8s3.6.9 4.6 2.8" fill="#000"></path>', 1), Qi = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><!></mask><circle cx="8" cy="8" r="7" fill="currentColor"></circle>', 1), $i = /* @__PURE__ */ b('<circle cx="3.5" cy="8" r="1.45" fill="currentColor"></circle><circle cx="8" cy="8" r="1.45" fill="currentColor"></circle><circle cx="12.5" cy="8" r="1.45" fill="currentColor"></circle>', 1), es = /* @__PURE__ */ b('<path d="M2.2 2.2l11.6 11.6" stroke="var(--icon-cut, rgb(20 20 30))" stroke-width="2.6" stroke-linecap="round"></path><path d="M2.2 2.2l11.6 11.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>', 1), ts = /* @__PURE__ */ b('<path d="M8 1.8c-2.4 0-4 1.8-4 4.2v2.7L2.6 10.9c-.3.4 0 .9.5.9h9.8c.5 0 .8-.5.5-.9L12 8.7V6c0-2.4-1.6-4.2-4-4.2z" fill="currentColor"></path><path d="M6.3 12.8a1.8 1.8 0 0 0 3.4 0z" fill="currentColor"></path><!>', 1), rs = /* @__PURE__ */ b('<path d="M12.6 6.2A4.9 4.9 0 0 0 3.6 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><path d="M13.6 3.2v3.6H10z" fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round"></path><path d="M3.4 9.8a4.9 4.9 0 0 0 9 1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><path d="M2.4 12.8V9.2H6z" fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round"></path>', 1), ns = /* @__PURE__ */ b('<path d="M2.5 8h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 1.5v4M6 3.8 8 5.8l2-2M8 14.5v-4M6 12.2l2-2 2 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>', 1), as = /* @__PURE__ */ b('<path d="M2.5 1.8h11M2.5 14.2h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 4.2v7.6M6 6.2l2-2 2 2M6 9.8l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>', 1), is = /* @__PURE__ */ b('<path d="M2.5 2.5l11 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>'), ss = /* @__PURE__ */ b('<g><path d="M5.2 1.6h5.6l-.7 1.3v3.2l2 2.4v1H3.9v-1l2-2.4V2.9z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path><path d="M8 9.5v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path></g><!>', 1), ls = /* @__PURE__ */ b('<circle cx="6.5" cy="5" r="2.6" fill="currentColor"></circle><path d="M1.5 13.5c.6-2.7 2.6-4.2 5-4.2s4.4 1.5 5 4.2z" fill="currentColor"></path><path d="M12.8 2.5v5M10.3 5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>', 1), os = /* @__PURE__ */ b('<path d="M13 6A5.2 5.2 0 0 0 3.4 4.4M3 10a5.2 5.2 0 0 0 9.6 1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path><path d="M14 2.6v3.8h-3.8zM2 13.4V9.6h3.8z" fill="currentColor"></path>', 1), fs = /* @__PURE__ */ b('<path d="M2.5 5h10M10 2.5 12.5 5 10 7.5M13.5 11h-10M6 8.5 3.5 11 6 13.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>'), us = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M4.2 5.8 6.4 8 4.2 10.2M7.8 10.6h4" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></mask><rect x="1.2" y="2.2" width="13.6" height="11.6" rx="2.4" fill="currentColor"></rect>', 1), cs = /* @__PURE__ */ b('<rect x="1.6" y="2.6" width="12.8" height="10.8" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M4.4 6 6.4 8 4.4 10M7.8 10.2h3.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>', 1), vs = /* @__PURE__ */ b('<path d="M7.2 2.2a5.6 5.6 0 1 0 6.6 7.6A5 5 0 0 1 7.2 2.2z" fill="currentColor"></path><path d="M12 1.8l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5zM14.3 5.6l.3.7.7.3-.7.3-.3.7-.3-.7-.7-.3.7-.3z" fill="currentColor"></path>', 1), hs = /* @__PURE__ */ b('<path d="M6.6 3a5.6 5.6 0 1 0 6.6 7.6A5 5 0 0 1 6.6 3z" fill="currentColor"></path><path d="M10 1.6h3.2L10 5h3.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"></path>', 1), ds = /* @__PURE__ */ b('<circle cx="5.6" cy="5.2" r="2.5" fill="currentColor"></circle><path d="M1 13.4c.4-2.6 2.2-4 4.6-4s4.2 1.4 4.6 4z" fill="currentColor"></path><circle cx="11.3" cy="5.6" r="2.1" fill="currentColor"></circle><path d="M10.9 9.4c2.2 0 3.7 1.3 4.1 3.6h-3.6c-.2-1.4-.6-2.6-1.4-3.5z" fill="currentColor"></path>', 1), _s = /* @__PURE__ */ b('<path d="M10.6 1.6a3.3 3.3 0 0 0-3.2 4.2L2.2 11a1.4 1.4 0 0 0 2 2l5.2-5.2a3.3 3.3 0 0 0 4.2-4.2l-1.9 1.9-1.6-.4-.4-1.6z" fill="currentColor"></path><path d="M2.6 2.6l1.6-.8 2.6 2.6-.8.8 4.6 4.6M11.4 11.4l1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>', 1), ps = /* @__PURE__ */ b('<path d="M7.8 1.8c-3 0-5.2 2.1-5.2 4.9 0 1.4.5 2.4 1.3 3.3v3.6c0 .4.3.6.6.6h4.2c.3 0 .6-.3.6-.6v-1.4h1.6c.7 0 1.2-.5 1.2-1.2V9.3l1.1-.4c.3-.1.4-.5.2-.8l-1.3-2C12 3.7 10.3 1.8 7.8 1.8z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M5.4 6.6c0-1.1.9-1.8 1.8-1.8.4-.5 1-.7 1.6-.5M6.6 8.6c.5.4 1.3.4 1.8 0" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>', 1), gs = /* @__PURE__ */ b('<path d="M5.3 8.2V3.4a.95.95 0 0 1 1.9 0v3.8V2.5a.95.95 0 0 1 1.9 0v4.7V3.2a.95.95 0 0 1 1.9 0v4.6-2.4a.9.9 0 0 1 1.8 0v4.4c0 2.8-1.9 4.7-4.5 4.7-1.7 0-2.8-.7-3.8-2L2.6 9.5a1 1 0 0 1 1.5-1.3z" fill="currentColor"></path>'), ms = /* @__PURE__ */ b('<path d="M2.6 4h10.8M6 4V2.6h4V4M4 4l.7 9.4h6.6L12 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>'), ks = /* @__PURE__ */ b('<path d="M2.2 11.4a6 6 0 1 1 11.6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 10.2 5.4 6.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><circle cx="8" cy="10.4" r="1.3" fill="currentColor"></circle>', 1), ws = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M8 6v3.4" stroke="#000" stroke-width="1.7" stroke-linecap="round"></path><circle cx="8" cy="11.6" r="1" fill="#000"></circle></mask><path d="M6.9 2.3a1.3 1.3 0 0 1 2.2 0l5.5 9.7c.5.9-.1 1.9-1.1 1.9H2.5c-1 0-1.6-1-1.1-1.9z" fill="currentColor"></path>', 1), ys = /* @__PURE__ */ b('<path d="M2.2 4.4 6.6 1.6l3.6 2.4-1.4 1.8-1.6-.6-.8 1 6.3 6.4a1.2 1.2 0 0 1-1.7 1.7L4.6 8l-1 .9z" fill="currentColor"></path>'), bs = /* @__PURE__ */ b('<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M8 1.8a6.2 6.2 0 0 0 0 12.4z" fill="currentColor"></path>', 1), Ms = /* @__PURE__ */ b('<rect x="1.2" y="2.4" width="13.6" height="11.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"></rect><rect x="8.4" y="4.6" width="4.2" height="6.8" rx="1" fill="currentColor"></rect>', 1), Es = /* @__PURE__ */ b('<path d="M14 2 9.4 6.6M9.2 3v3.8H13M2 14l4.6-4.6M3 9.2h3.8V13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>'), Cs = /* @__PURE__ */ b('<path d="M9.4 6.6 14 2M10.2 2H14v3.8M6.6 9.4 2 14M2 10.2V14h3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>'), xs = /* @__PURE__ */ b('<path d="M3 8h10" stroke="currentColor" stroke-width="1"></path>'), Ss = /* @__PURE__ */ b('<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1"></path>'), As = /* @__PURE__ */ b('<rect x="3.6" y="1.6" width="10.8" height="8.4" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="1.4" y="5.4" width="10.4" height="8.8" rx="1.8" fill="currentColor"></rect><path d="M3.6 8.6 5.2 10l-1.6 1.4M6.4 11.8h2.8" fill="none" stroke="rgb(20 20 30)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"></path>', 1), Ts = /* @__PURE__ */ b('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M5.2 8.2l1.9 1.9 3.8-4.2" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></mask><path d="M8 .9l1.6 1.2 2-.1.6 1.9 1.7 1.1-.6 1.9.6 1.9-1.7 1.1-.6 1.9-2-.1L8 15.1l-1.6-1.2-2 .1-.6-1.9-1.7-1.1.6-1.9-.6-1.9 1.7-1.1.6-1.9 2 .1z" fill="currentColor" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"></path>', 1), zs = /* @__PURE__ */ b('<rect x="1.6" y="1.6" width="12.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M6 10 10.4 5.6M7 5.4h3.6V9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>', 1), qs = /* @__PURE__ */ b('<rect x="1.6" y="1.6" width="12.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>', 1), Rs = /* @__PURE__ */ b('<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M3.8 3.8l8.4 8.4" stroke="currentColor" stroke-width="1.5"></path>', 1), Ns = /* @__PURE__ */ b('<svg viewBox="0 0 16 16" aria-hidden="true"><!></svg>');
function Dt(e, t) {
  const r = hi();
  let n = nt(t, "size", 3, 12), a = nt(t, "class", 3, "");
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
      U(() => J(d, "fill", t.name === "star-fill" ? "currentColor" : "none")), k(f, d);
    }, h = (f) => {
      var d = Yi();
      k(f, d);
    }, p = (f) => {
      var d = Qi(), I = Ue(d), X = E(z(I));
      {
        var A = (H) => {
          var $ = Gi();
          k(H, $);
        }, L = (H) => {
          var $ = Wi();
          k(H, $);
        }, ne = (H) => {
          var $ = Ki();
          k(H, $);
        }, He = (H) => {
          var $ = Zi();
          k(H, $);
        }, ft = (H) => {
          var $ = Xi();
          k(H, $);
        }, ut = (H) => {
          var $ = Ji();
          k(H, $);
        };
        me(X, (H) => {
          t.name === "xmark-circle" ? H(A) : t.name === "check-circle" ? H(L, 1) : t.name === "pause-circle" ? H(ne, 2) : t.name === "minus-circle" ? H(He, 3) : t.name === "arrow-down-circle" ? H(ft, 4) : H(ut, -1);
        });
      }
      var or = E(I);
      U(() => {
        J(I, "id", r), J(or, "mask", i);
      }), k(f, d);
    }, w = (f) => {
      var d = $i();
      k(f, d);
    }, m = (f) => {
      var d = ts(), I = E(Ue(d), 2);
      {
        var X = (A) => {
          var L = es();
          k(A, L);
        };
        me(I, (A) => {
          t.name === "bell-slash" && A(X);
        });
      }
      k(f, d);
    }, y = (f) => {
      var d = rs();
      k(f, d);
    }, x = (f) => {
      var d = ns();
      k(f, d);
    }, N = (f) => {
      var d = as();
      k(f, d);
    }, T = (f) => {
      var d = ss(), I = Ue(d), X = z(I), A = E(I);
      {
        var L = (ne) => {
          var He = is();
          k(ne, He);
        };
        me(A, (ne) => {
          t.name === "pin-slash" && ne(L);
        });
      }
      U(() => {
        J(I, "transform", t.name === "pin-slash" ? "rotate(45 8 8)" : ""), J(X, "fill", t.name === "pin" ? "currentColor" : "none");
      }), k(f, d);
    }, P = (f) => {
      var d = ls();
      k(f, d);
    }, ie = (f) => {
      var d = os();
      k(f, d);
    }, Y = (f) => {
      var d = fs();
      k(f, d);
    }, le = (f) => {
      var d = us(), I = Ue(d), X = E(I);
      U(() => {
        J(I, "id", r), J(X, "mask", i);
      }), k(f, d);
    }, ve = (f) => {
      var d = cs();
      k(f, d);
    }, D = (f) => {
      var d = vs();
      k(f, d);
    }, Pe = (f) => {
      var d = hs();
      k(f, d);
    }, we = (f) => {
      var d = ds();
      k(f, d);
    }, it = (f) => {
      var d = _s();
      k(f, d);
    }, St = (f) => {
      var d = ps();
      k(f, d);
    }, At = (f) => {
      var d = gs();
      k(f, d);
    }, Tt = (f) => {
      var d = ms();
      k(f, d);
    }, st = (f) => {
      var d = ks();
      k(f, d);
    }, lt = (f) => {
      var d = ws(), I = Ue(d), X = E(I);
      U(() => {
        J(I, "id", r), J(X, "mask", i);
      }), k(f, d);
    }, C = (f) => {
      var d = ys();
      k(f, d);
    }, j = (f) => {
      var d = bs();
      k(f, d);
    }, oe = (f) => {
      var d = Ms();
      k(f, d);
    }, ye = (f) => {
      var d = Es();
      k(f, d);
    }, he = (f) => {
      var d = Cs();
      k(f, d);
    }, G = (f) => {
      var d = xs();
      k(f, d);
    }, Z = (f) => {
      var d = Ss();
      k(f, d);
    }, re = (f) => {
      var d = As();
      k(f, d);
    }, Fe = (f) => {
      var d = Ts(), I = Ue(d), X = E(I);
      U(() => {
        J(I, "id", r), J(X, "mask", i);
      }), k(f, d);
    }, Ve = (f) => {
      var d = zs();
      k(f, d);
    }, Ze = (f) => {
      var d = qs();
      k(f, d);
    }, ot = (f) => {
      var d = Rs();
      k(f, d);
    };
    me(l, (f) => {
      t.name === "chevron-right" ? f(o) : t.name === "chevron-down" ? f(u, 1) : t.name === "chevron-left" ? f(c, 2) : t.name === "folder" ? f(v, 3) : t.name === "star" || t.name === "star-fill" ? f(_, 4) : t.name === "xmark" ? f(h, 5) : t.name === "xmark-circle" || t.name === "check-circle" || t.name === "pause-circle" || t.name === "minus-circle" || t.name === "arrow-down-circle" || t.name === "person" ? f(p, 6) : t.name === "ellipsis" ? f(w, 7) : t.name === "bell" || t.name === "bell-slash" ? f(m, 8) : t.name === "refresh" ? f(y, 9) : t.name === "compress" ? f(x, 10) : t.name === "expand" ? f(N, 11) : t.name === "pin" || t.name === "pin-slash" ? f(T, 12) : t.name === "person-plus" ? f(P, 13) : t.name === "person-switch" ? f(ie, 14) : t.name === "swap" ? f(Y, 15) : t.name === "terminal" ? f(le, 16) : t.name === "terminal-outline" ? f(ve, 17) : t.name === "moon-stars" ? f(D, 18) : t.name === "moon-zzz" ? f(Pe, 19) : t.name === "people" ? f(we, 20) : t.name === "wrench" ? f(it, 21) : t.name === "brain" ? f(St, 22) : t.name === "hand" ? f(At, 23) : t.name === "trash" ? f(Tt, 24) : t.name === "gauge" ? f(st, 25) : t.name === "warn" ? f(lt, 26) : t.name === "hammer" ? f(C, 27) : t.name === "half-circle" ? f(j, 28) : t.name === "snap-right" ? f(oe, 29) : t.name === "shrink" ? f(ye, 30) : t.name === "grow" ? f(he, 31) : t.name === "win-min" ? f(G, 32) : t.name === "win-close" ? f(Z, 33) : t.name === "shells" ? f(re, 34) : t.name === "seal-check" ? f(Fe, 35) : t.name === "app-forward" ? f(Ve, 36) : t.name === "app-plus" ? f(Ze, 37) : t.name === "nosign" && f(ot, 38);
    });
  }
  U(() => {
    rt(s, 0, `icon ${a() ?? ""}`, "svelte-1rfkemj"), J(s, "width", n()), J(s, "height", n());
  }), k(e, s);
}
function Sr(e) {
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
const ht = { waiting: 0, working: 1, paused: 2, idle: 3 }, Jn = (e) => ({ 접수: "waiting", "진행 중": "working", 대기: "paused", 완료: "idle" })[e] || "waiting";
function Ar(e) {
  let t = "idle", r = 99;
  for (const n of e.sessions)
    ht[n.state] < r && (r = ht[n.state], t = n.state);
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
    i.has(l) || i.set(l, { id: l, name: l, sessions: [] }), i.get(l).sessions.push({ ...s, state: Jn(s.status) });
  }
  for (const s of i.values()) s.sessions.sort((l, o) => ht[l.state] - ht[o.state] || (l.due_date || "9999").localeCompare(o.due_date || "9999") || o.created_at.localeCompare(l.created_at));
  return [...i.values()].sort((s, l) => ht[Ar(s)] - ht[Ar(l)] || s.name.localeCompare(l.name, "ko"));
}
var Ds = /* @__PURE__ */ Q('<span class="track svelte-aqlqqq"></span> <span class="spin svelte-aqlqqq"><span class="head svelte-aqlqqq"></span></span>', 1), js = /* @__PURE__ */ Q('<span class="ripple svelte-aqlqqq"></span> <span class="dot svelte-aqlqqq"></span>', 1), en = /* @__PURE__ */ Q('<span class="pop svelte-aqlqqq"><!></span>'), Ps = /* @__PURE__ */ Q('<span class="pop ended svelte-aqlqqq"><!></span>'), Fs = /* @__PURE__ */ Q('<span class="inner svelte-aqlqqq"><!></span>'), Vs = /* @__PURE__ */ Q('<span class="box svelte-aqlqqq"><!></span>');
function nr(e, t) {
  Ht(t, !0);
  let r = nt(t, "scale", 3, 1);
  var n = Vs();
  let a;
  var i = z(n);
  bi(i, () => t.state, (s) => {
    var l = Fs(), o = z(l);
    {
      var u = (p) => {
        var w = Ds();
        k(p, w);
      }, c = (p) => {
        var w = js();
        k(p, w);
      }, v = (p) => {
        var w = en(), m = z(w);
        Dt(m, { name: "check-circle", size: 16 }), k(p, w);
      }, _ = (p) => {
        var w = en(), m = z(w);
        Dt(m, { name: "pause-circle", size: 16 }), k(p, w);
      }, h = (p) => {
        var w = Ps(), m = z(w);
        Dt(m, { name: "minus-circle", size: 15 }), k(p, w);
      };
      me(o, (p) => {
        t.state === "working" ? p(u) : t.state === "waiting" ? p(c, 1) : t.state === "idle" ? p(v, 2) : t.state === "paused" ? p(_, 3) : p(h, -1);
      });
    }
    k(s, l);
  }), U((s) => a = xr(n, "", a, { "--c": s, "--s": r() }), [() => Sr(t.state)]), k(e, n), Bt();
}
var Hs = /* @__PURE__ */ Q('<button class="request-row svelte-v68t2j"><!> <span class="request-main svelte-v68t2j"><strong class="svelte-v68t2j"> </strong><span class="svelte-v68t2j"> </span></span> <span class="request-end svelte-v68t2j"><span class="request-status svelte-v68t2j"> </span><small> </small><small class="svelte-v68t2j"> </small></span></button>');
function tn(e, t) {
  Ht(t, !0);
  const r = /* @__PURE__ */ be(() => t.task.status !== "완료" && t.task.due_date && t.task.due_date < t.today);
  var n = Hs(), a = z(n);
  nr(a, {
    get state() {
      return t.task.state;
    }
  });
  var i = E(a, 2), s = z(i), l = F(s, !0), o = E(s), u = F(o), c = E(i, 2), v = z(c), _ = F(v), h = E(v);
  let p;
  var w = F(h, !0), m = E(h), y = F(m, !0);
  U(
    (x) => {
      R(l, t.task.title), R(u, `${t.task.requester ?? ""}${t.task.department ? " · " + t.task.department : ""} · ${t.task.channel ?? ""}`), R(_, `${t.task.status ?? ""}${t.task.priority ? " · " + t.task.priority : ""}`), p = rt(h, 1, "svelte-v68t2j", null, p, { overdue: g(r) }), R(w, t.task.due_date ? `기한 ${t.task.due_date}` : "기한 미지정"), R(y, x);
    },
    [
      () => t.task.status === "완료" ? "처리 완료" : "접수 후 " + Is(Date.parse(t.task.created_at), t.now)
    ]
  ), Ie("click", n, () => t.onopen(t.task.id)), k(e, n), Bt();
}
jr(["click"]);
var Bs = /* @__PURE__ */ Q('<span class="count svelte-sz6uh1"><span class="dot svelte-sz6uh1"></span> </span>'), Us = /* @__PURE__ */ Q('<button class="completed-toggle svelte-sz6uh1"><span class="svelte-sz6uh1"> </span><span class="svelte-sz6uh1">이력 보기</span></button><!>', 1), Ys = /* @__PURE__ */ Q('<div class="body svelte-sz6uh1"><!> <!></div>'), Gs = /* @__PURE__ */ Q('<button class="svelte-sz6uh1"><!><span class="svelte-sz6uh1"> </span></button>'), Ws = /* @__PURE__ */ Q('<small class="svelte-sz6uh1"> </small>'), Ks = /* @__PURE__ */ Q('<div class="compact-list svelte-sz6uh1"><!><!></div>'), Zs = /* @__PURE__ */ Q('<div><button class="head svelte-sz6uh1"><span><!></span> <span class="folder svelte-sz6uh1"><!></span> <span class="names svelte-sz6uh1"><span class="name svelte-sz6uh1"> </span><span class="path svelte-sz6uh1"><!></span></span> <span class="counts svelte-sz6uh1"></span></button> <!></div>');
function Xs(e, t) {
  Ht(t, !0);
  let r = nt(t, "compact", 3, !1), n = /* @__PURE__ */ ee(!1), a = /* @__PURE__ */ ee(!1);
  const i = /* @__PURE__ */ be(() => Ar(t.g)), s = /* @__PURE__ */ be(() => Sr(g(i))), l = /* @__PURE__ */ be(() => Os(t.g)), o = /* @__PURE__ */ be(() => g(l)[0]), u = /* @__PURE__ */ be(() => t.g.sessions.filter((C) => C.status !== "완료")), c = /* @__PURE__ */ be(() => t.g.sessions.filter((C) => C.status === "완료")), v = /* @__PURE__ */ be(() => ["waiting", "working", "paused", "idle"].map((C) => ({
    st: C,
    n: t.g.sessions.filter((j) => j.state === C).length
  })).filter((C) => C.n)), _ = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(/* @__PURE__ */ new Date());
  var h = Zs();
  let p, w;
  var m = z(h), y = z(m);
  let x;
  var N = z(y);
  Dt(N, { name: "chevron-right", size: 11 });
  var T = E(y, 2), P = z(T);
  {
    var ie = (C) => {
      nr(C, {
        get state() {
          return g(o).state;
        }
      });
    }, Y = (C) => {
      Dt(C, { name: "folder", size: 14 });
    };
    me(P, (C) => {
      g(n) && g(o) ? C(ie) : C(Y, -1);
    });
  }
  var le = E(T, 2), ve = z(le), D = F(ve, !0), Pe = E(ve), we = z(Pe);
  {
    var it = (C) => {
      var j = Zr();
      U(() => R(j, `${g(o).status ?? ""} · ${g(o).title ?? ""}`)), k(C, j);
    }, St = (C) => {
      var j = Zr();
      U(() => R(j, `전체 ${t.g.sessions.length ?? ""}건 · 미완료 ${g(u).length ?? ""}건`)), k(C, j);
    };
    me(we, (C) => {
      g(n) && g(o) ? C(it) : C(St, -1);
    });
  }
  var At = E(le, 2);
  vt(At, 21, () => g(v), Er, (C, j) => {
    var oe = Bs(), ye = z(oe);
    let he;
    var G = E(ye, 1, !0);
    U(
      (Z) => {
        he = xr(ye, "", he, { background: Z }), R(G, g(j).n);
      },
      [() => `rgb(${Sr(g(j).st) ?? ""})`]
    ), k(C, oe);
  });
  var Tt = E(m, 2);
  {
    var st = (C) => {
      var j = Ys(), oe = z(j);
      vt(oe, 17, () => g(u), (G) => G.id, (G, Z) => {
        tn(G, {
          get task() {
            return g(Z);
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
      var ye = E(oe, 2);
      {
        var he = (G) => {
          var Z = Us(), re = Ue(Z), Fe = z(re), Ve = F(Fe), Ze = E(re);
          {
            var ot = (f) => {
              var d = vi(), I = Ue(d);
              vt(I, 17, () => g(c), (X) => X.id, (X, A) => {
                tn(X, {
                  get task() {
                    return g(A);
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
            me(Ze, (f) => {
              g(a) && f(ot);
            });
          }
          U(() => {
            J(re, "aria-expanded", g(a)), R(Ve, `${g(a) ? "▾" : "▸"} 완료 업무 ${g(c).length ?? ""}건`);
          }), Ie("click", re, () => B(a, !g(a))), k(G, Z);
        };
        me(ye, (G) => {
          g(c).length && G(he);
        });
      }
      k(C, j);
    }, lt = (C) => {
      var j = Ks(), oe = z(j);
      vt(oe, 17, () => t.g.sessions.slice(0, 3), Er, (G, Z) => {
        var re = Gs(), Fe = z(re);
        nr(Fe, {
          get state() {
            return g(Z).state;
          },
          scale: 0.7
        });
        var Ve = E(Fe), Ze = F(Ve, !0);
        U(() => R(Ze, g(Z).title)), Ie("click", re, () => t.onopen(g(Z).id)), k(G, re);
      });
      var ye = E(oe);
      {
        var he = (G) => {
          var Z = Ws(), re = F(Z);
          U(() => R(re, `상세 보기에서 나머지 ${t.g.sessions.length - 3}건을 확인하세요.`)), k(G, Z);
        };
        me(ye, (G) => {
          t.g.sessions.length > 3 && G(he);
        });
      }
      k(C, j);
    };
    me(Tt, (C) => {
      !g(n) && !r() ? C(st) : r() && !g(n) && C(lt, 1);
    });
  }
  U(() => {
    p = rt(h, 1, "card svelte-sz6uh1", null, p, { waiting: g(i) === "waiting" }), w = xr(h, "", w, { "--c": g(s) }), J(m, "aria-expanded", !g(n)), x = rt(y, 1, "chev svelte-sz6uh1", null, x, { open: !g(n) }), R(D, t.g.name);
  }), Ie("click", m, () => B(n, !g(n))), k(e, h), Bt();
}
jr(["click"]);
var Js = /* @__PURE__ */ Q('<button><!> <b class="svelte-nytrg3"> </b></button>'), Qs = /* @__PURE__ */ Q('<p role="alert"> </p>'), $s = /* @__PURE__ */ Q('<div class="board-empty svelte-nytrg3"><strong class="svelte-nytrg3"> </strong><p class="svelte-nytrg3"> </p></div>'), el = /* @__PURE__ */ Q('<section class="claude-workboard svelte-nytrg3" aria-label="총무 업무 카드 보드"><div class="board-title svelte-nytrg3"><div><p class="svelte-nytrg3"> </p><h2 class="svelte-nytrg3"> </h2><span class="svelte-nytrg3"> </span></div><span class="board-role svelte-nytrg3"> </span></div> <div class="state-chips svelte-nytrg3" aria-label="업무 상태 필터"><button>전체 <b class="svelte-nytrg3"> </b></button><!></div> <div class="board-controls svelte-nytrg3"><input type="search" placeholder="업무·요청자·부서·내용 검색" aria-label="업무 검색" class="svelte-nytrg3"/><select aria-label="카드 분류 기준" class="svelte-nytrg3"><option>업무 분류별</option><option>요청 부서별</option><option>접수 경로별</option></select><button class="svelte-nytrg3"> </button><button class="svelte-nytrg3">CSV 내보내기</button><button class="svelte-nytrg3"> </button></div> <!> <div class="board-summary svelte-nytrg3"><span> </span><small class="svelte-nytrg3">접수 → 진행 중 → 대기 → 완료 순 · 시각은 한국 시간 기준</small></div> <div></div> <p class="board-credit svelte-nytrg3">Claude Board의 카드·상태 컴포넌트를 총무 업무용으로 적용했습니다. <a href="/third-party-notices" target="_blank" rel="noreferrer" class="svelte-nytrg3">오픈소스 안내 ↗</a></p></section>');
function tl(e, t) {
  Ht(t, !0);
  let r = nt(t, "tasks", 7), n = nt(t, "texts", 19, () => ({})), a = nt(t, "readonly", 3, !1), i = /* @__PURE__ */ ee(""), s = /* @__PURE__ */ ee(""), l = /* @__PURE__ */ ee("category"), o = /* @__PURE__ */ ee(!1), u = /* @__PURE__ */ ee(Qe(Date.now())), c = /* @__PURE__ */ ee(!1), v = /* @__PURE__ */ ee("");
  const _ = ["접수", "진행 중", "대기", "완료"], h = /* @__PURE__ */ be(() => Ls(r(), {
    query: g(i),
    status: g(s),
    groupBy: g(l)
  })), p = /* @__PURE__ */ be(() => g(h).reduce((A, L) => A + L.sessions.length, 0));
  Qa(() => {
    const A = setInterval(() => B(u, Date.now(), !0), 6e4);
    return () => clearInterval(A);
  });
  async function w() {
    B(c, !0), B(v, "");
    try {
      r(await t.onrefresh());
    } catch (A) {
      B(v, A.message, !0);
    } finally {
      B(c, !1);
    }
  }
  var m = el(), y = z(m), x = z(y), N = z(x), T = F(N, !0), P = E(N), ie = F(P, !0), Y = E(P), le = F(Y, !0), ve = E(x), D = F(ve, !0), Pe = E(y, 2), we = z(Pe);
  let it;
  var St = E(z(we)), At = F(St, !0), Tt = E(we);
  vt(Tt, 17, () => _, Er, (A, L) => {
    var ne = Js();
    let He;
    var ft = z(ne);
    {
      let $ = /* @__PURE__ */ be(() => Jn(g(L)));
      nr(ft, {
        get state() {
          return g($);
        },
        scale: 0.8
      });
    }
    var ut = E(ft, 1, !0), or = E(ut), H = F(or, !0);
    U(
      ($) => {
        J(ne, "aria-pressed", g(s) === g(L)), He = rt(ne, 1, "svelte-nytrg3", null, He, { chosen: g(s) === g(L) }), R(ut, g(L)), R(H, $);
      },
      [() => r().filter(($) => $.status === g(L)).length]
    ), Ie("click", ne, () => B(s, g(s) === g(L) ? "" : g(L), !0)), k(A, ne);
  });
  var st = E(Pe, 2), lt = z(st), C = E(lt), j = z(C);
  j.value = j.__value = "category";
  var oe = E(j);
  oe.value = oe.__value = "department";
  var ye = E(oe);
  ye.value = ye.__value = "channel", zi(C);
  var he = E(C), G = F(he, !0), Z = E(he), re = E(Z), Fe = F(re, !0), Ve = E(st, 2);
  {
    var Ze = (A) => {
      var L = Qs(), ne = F(L, !0);
      U(() => R(ne, g(v))), k(A, L);
    };
    me(Ve, (A) => {
      g(v) && A(Ze);
    });
  }
  var ot = E(Ve, 2), f = z(ot), d = F(f), I = E(ot, 2);
  let X;
  vt(
    I,
    21,
    () => g(h),
    (A) => A.id,
    (A, L) => {
      Xs(A, {
        get g() {
          return g(L);
        },
        get now() {
          return g(u);
        },
        get onopen() {
          return t.onopen;
        },
        get compact() {
          return g(o);
        }
      });
    },
    (A) => {
      var L = $s(), ne = z(L), He = F(ne, !0), ft = E(ne), ut = F(ft, !0);
      U(() => {
        R(He, r().length ? "조건에 맞는 업무가 없습니다." : "첫 업무를 기록해 보세요."), R(ut, r().length ? "검색어나 상태 필터를 바꿔보세요." : a() ? "담당자가 등록한 업무가 이곳에 표시됩니다." : "오른쪽 위 새 업무 등록 버튼으로 구두·메신저 요청을 접수하세요.");
      }), k(A, L);
    }
  ), U(() => {
    R(T, n().cardEyebrow || "GENERAL AFFAIRS · LIVE BOARD"), R(ie, n().cardTitle || "흩어진 요청을, 한 장의 보드로."), R(le, n().cardDescription || "분류별로 모으고, 상태별로 살펴보세요."), R(D, a() ? "조회 전용" : "업무 관리"), J(we, "aria-pressed", !g(s)), it = rt(we, 1, "svelte-nytrg3", null, it, { chosen: !g(s) }), R(At, r().length), J(he, "aria-pressed", g(o)), R(G, g(o) ? "상세 보기" : "간략 보기"), re.disabled = g(c), R(Fe, g(c) ? "불러오는 중…" : "새로고침"), R(d, `${g(h).length ?? ""}개 그룹 · ${g(p) ?? ""}건`), X = rt(I, 1, "group-grid svelte-nytrg3", null, X, { compact: g(o) });
  }), Ie("click", we, () => B(s, "")), Di(lt, () => g(i), (A) => B(i, A)), qi(C, () => g(l), (A) => B(l, A)), Ie("click", he, () => B(o, !g(o))), Ie("click", Z, function(...A) {
    t.onexport?.apply(this, A);
  }), Ie("click", re, w), k(e, m), Bt();
}
jr(["click"]);
function nl(e, t) {
  const r = mi(tl, { target: e, props: t });
  return () => wi(r);
}
export {
  nl as mountBoard
};
