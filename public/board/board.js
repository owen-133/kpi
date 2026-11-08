var vr = Array.isArray, Ma = Array.prototype.indexOf, Bt = Array.prototype.includes, dr = Array.from, yn = Object.defineProperty, _t = Object.getOwnPropertyDescriptor, Ea = Object.getOwnPropertyDescriptors, Ca = Object.prototype, xa = Array.prototype, bn = Object.getPrototypeOf, en = Object.isExtensible;
const Sa = () => {
};
function Aa(e) {
  for (var t = 0; t < e.length; t++)
    e[t]();
}
function Mn() {
  var e, t, r = new Promise((n, a) => {
    e = n, t = a;
  });
  return { promise: r, resolve: e, reject: t };
}
const ne = 2, wt = 4, hr = 8, En = 1 << 24, be = 16, xe = 32, Ke = 64, Er = 128, Lr = 256, Ce = 512, J = 1024, O = 2048, _e = 4096, ae = 8192, ee = 16384, xt = 32768, ir = 1 << 25, yt = 65536, sr = 1 << 17, Ta = 1 << 18, St = 1 << 19, qa = 1 << 20, Re = 1 << 25, lr = 1 << 21, pt = 1 << 22, Ge = 1 << 23, gt = /* @__PURE__ */ Symbol("$state"), Cn = /* @__PURE__ */ Symbol("component"), za = /* @__PURE__ */ Symbol("legacy props"), Ra = /* @__PURE__ */ Symbol(""), xn = /* @__PURE__ */ Symbol("attributes"), Cr = /* @__PURE__ */ Symbol("class"), xr = /* @__PURE__ */ Symbol("style"), Sr = /* @__PURE__ */ Symbol("text"), nr = /* @__PURE__ */ Symbol("form reset"), Gt = new class extends Error {
  name = "StaleReactionError";
  message = "The reaction that called `getAbortSignal()` was re-run or destroyed";
}(), Na = 1, Oa = 2, Sn = 4, Da = 8, Ia = 16, La = 1, ja = 4, Fa = 8, Pa = 16, An = 1, Va = 2, Tn = {}, Z = /* @__PURE__ */ Symbol("uninitialized"), Ha = "http://www.w3.org/1999/xhtml";
function Ba() {
  console.warn("https://svelte.dev/e/derived_inert");
}
function Ua() {
  console.warn("https://svelte.dev/e/select_multiple_invalid_value");
}
function Ya() {
  console.warn("https://svelte.dev/e/svelte_boundary_reset_noop");
}
function qn(e) {
  return e === this.v;
}
function Ga(e, t) {
  return e != e ? t == t : e !== t || e !== null && typeof e == "object" || typeof e == "function";
}
function zn(e) {
  return !Ga(e, this.v);
}
function Ka() {
  throw new Error("https://svelte.dev/e/async_derived_orphan");
}
function Wa(e, t, r) {
  throw new Error("https://svelte.dev/e/each_key_duplicate");
}
function Za(e) {
  throw new Error("https://svelte.dev/e/effect_in_teardown");
}
function Xa() {
  throw new Error("https://svelte.dev/e/effect_in_unowned_derived");
}
function Ja(e) {
  throw new Error("https://svelte.dev/e/effect_orphan");
}
function Qa() {
  throw new Error("https://svelte.dev/e/effect_update_depth_exceeded");
}
function $a(e) {
  throw new Error("https://svelte.dev/e/props_invalid_value");
}
function ei() {
  throw new Error("https://svelte.dev/e/state_descriptors_fixed");
}
function ti() {
  throw new Error("https://svelte.dev/e/state_prototype_fixed");
}
function ri() {
  throw new Error("https://svelte.dev/e/state_unsafe_mutation");
}
function ni() {
  throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror");
}
let ue = null;
function bt(e) {
  ue = e;
}
function Kt(e, t = !1, r) {
  ue = {
    p: ue,
    i: !1,
    c: null,
    e: null,
    s: e,
    x: null,
    r: (
      /** @type {Effect} */
      z
    ),
    l: null
  };
}
function Wt(e) {
  var t = (
    /** @type {ComponentContext} */
    ue
  ), r = t.e;
  if (r !== null) {
    t.e = null;
    for (var n of r)
      Qn(n);
  }
  return t.i = !0, ue = t.p, Rn(e);
}
function Rn(e = {}) {
  return yn(e, Cn, { value: !0 }), e;
}
function Nn() {
  return !0;
}
let et = [];
function On() {
  var e = et;
  et = [], Aa(e);
}
function Ye(e) {
  if (et.length === 0 && !Ft) {
    var t = et;
    queueMicrotask(() => {
      t === et && On();
    });
  }
  et.push(e);
}
function ai() {
  for (; et.length > 0; )
    On();
}
const ii = -7169;
function H(e, t) {
  e.f = e.f & ii | t;
}
function jr(e) {
  (e.f & Ce) !== 0 || e.deps === null ? H(e, J) : H(e, _e);
}
function Dn(e, t) {
  (e.f & O) !== 0 ? t.set(e, O) : (e.f & _e) !== 0 && t.get(e) !== O && t.set(e, _e), H(e, J);
}
let tn = !1;
function si() {
  tn || (tn = !0, document.addEventListener(
    "reset",
    (e) => {
      Promise.resolve().then(() => {
        if (!e.defaultPrevented)
          for (
            const t of
            /**@type {HTMLFormElement} */
            e.target.elements
          )
            t[nr]?.();
      });
    },
    // In the capture phase to guarantee we get noticed of it (no possibility of stopPropagation)
    { capture: !0 }
  ));
}
function Zt(e) {
  var t = S, r = z;
  we(null), De(null);
  try {
    return e();
  } finally {
    we(t), De(r);
  }
}
function In(e, t, r, n = r) {
  e.addEventListener(t, () => Zt(r));
  const a = (
    /** @type {any} */
    e[nr]
  );
  a ? e[nr] = () => {
    a(), n(!0);
  } : e[nr] = () => n(!0), si();
}
function li(e, t, r, n) {
  const a = Ut;
  var i = e.filter((d) => !d.settled), s = t.map(a);
  if (r.length === 0 && i.length === 0) {
    n(s);
    return;
  }
  var l = (
    /** @type {Effect} */
    z
  ), o = oi(), f = i.length === 1 ? i[0].promise : i.length > 1 ? Promise.all(i.map((d) => d.promise)) : null;
  function u(d) {
    if ((l.f & ee) === 0) {
      o();
      try {
        n([...s, ...d]);
      } catch (g) {
        ze(g, l);
      }
      or();
    }
  }
  var v = Ln();
  if (r.length === 0) {
    f.then(() => u([])).finally(v);
    return;
  }
  function _() {
    Promise.all(r.map((d) => /* @__PURE__ */ ui(d))).then(u).catch((d) => ze(d, l)).finally(v);
  }
  f ? f.then(() => {
    if ((l.f & ee) !== 0) {
      v();
      return;
    }
    o(), _(), or();
  }) : _();
}
function oi() {
  var e = (
    /** @type {Effect} */
    z
  ), t = S, r = ue, n = (
    /** @type {Batch} */
    E
  );
  return function(i = !0) {
    De(e), we(t), bt(r), i && (e.f & ee) === 0 && (n?.activate(), n?.apply());
  };
}
function or(e = !0) {
  De(null), we(null), bt(null), e && E?.deactivate();
}
function Ln() {
  var e = (
    /** @type {Effect} */
    z
  ), t = e.b, r = (
    /** @type {Batch} */
    E
  ), n = !!t?.is_rendered();
  return t?.update_pending_count(1, r), r.increment(n, e), () => {
    t?.update_pending_count(-1, r), r.decrement(n, e);
  };
}
// @__NO_SIDE_EFFECTS__
function Ut(e) {
  var t = ne | O;
  return z !== null && (z.f |= St), {
    ctx: ue,
    deps: null,
    effects: null,
    equals: qn,
    f: t,
    fn: e,
    reactions: null,
    rv: 0,
    v: (
      /** @type {V} */
      Z
    ),
    wv: 0,
    parent: z,
    ac: null
  };
}
const It = /* @__PURE__ */ Symbol("obsolete");
// @__NO_SIDE_EFFECTS__
function ui(e, t, r) {
  let n = (
    /** @type {Effect | null} */
    z
  );
  n === null && Ka();
  var a = (
    /** @type {Promise<V>} */
    /** @type {unknown} */
    void 0
  ), i = lt(
    /** @type {V} */
    Z
  ), s = !S, l = /* @__PURE__ */ new Set();
  return xi(() => {
    var o = (
      /** @type {Effect} */
      z
    ), f = Mn();
    a = f.promise;
    try {
      Promise.resolve(e()).then(f.resolve, (d) => {
        d !== Gt && f.reject(d);
      }).finally(or);
    } catch (d) {
      f.reject(d), or();
    }
    var u = (
      /** @type {Batch} */
      E
    );
    if (s) {
      if ((o.f & xt) !== 0)
        var v = Ln();
      if (
        // boundary can be null if the async derived is inside an $effect.root not connected to the component render tree
        n.b?.is_rendered()
      )
        u.async_deriveds.get(o)?.reject(It);
      else
        for (const d of l.values())
          d.reject(It);
      l.add(f), u.async_deriveds.set(o, f);
    }
    const _ = (d, g = void 0) => {
      v?.(), l.delete(f), g !== It && (u.activate(), g ? (i.f |= Ge, Mt(i, g)) : ((i.f & Ge) !== 0 && (i.f ^= Ge), Mt(i, d)), u.deactivate());
    };
    f.promise.then(_, (d) => _(null, d || "unknown"));
  }), Jn(() => {
    for (const o of l)
      o.reject(It);
  }), new Promise((o) => {
    function f(u) {
      function v() {
        u === a ? o(i) : f(a);
      }
      u.then(v, v);
    }
    f(a);
  });
}
// @__NO_SIDE_EFFECTS__
function me(e) {
  const t = /* @__PURE__ */ Ut(e);
  return aa(t), t;
}
// @__NO_SIDE_EFFECTS__
function jn(e) {
  const t = /* @__PURE__ */ Ut(e);
  return t.equals = zn, t;
}
function fi(e) {
  var t = e.effects;
  if (t !== null) {
    e.effects = null;
    for (var r = 0; r < t.length; r += 1)
      fe(
        /** @type {Effect} */
        t[r]
      );
  }
}
function Fr(e) {
  var t, r = z, n = e.parent;
  if (!Pe && n !== null && e.v !== Z && // if it was never evaluated before, it's guaranteed to fail downstream, so we try to execute instead
  (n.f & (ee | ae)) !== 0)
    return Ba(), e.v;
  De(n);
  try {
    fi(e), t = oa(e);
  } finally {
    De(r);
  }
  return t;
}
function Fn(e) {
  var t = Fr(e);
  if (!e.equals(t) && (e.wv = sa(), (!E?.is_fork || e.deps === null) && (E !== null ? (E.capture(e, t, !0), mt?.capture(e, t, !0)) : e.v = t, e.deps === null))) {
    H(e, J);
    return;
  }
  Pe || (Me !== null ? (Hr() || E?.is_fork) && Me.set(e, t) : jr(e));
}
function ci(e) {
  if (e.effects !== null)
    for (const t of e.effects)
      (t.teardown || t.ac) && (t.teardown?.(), t.ac !== null && Zt(() => {
        t.ac.abort(Gt), t.ac = null;
      }), t.fn !== null && (t.teardown = Sa), Yt(t, 0), Br(t));
}
function Pn(e) {
  if (e.effects !== null)
    for (const t of e.effects)
      t.teardown && t.fn !== null && Et(t);
}
let pr = null, vt = null, E = null, mt = null, Me = null, Ar = null, Ft = !1, gr = !1, Pt = null, ar = null;
var rn = 0;
let vi = 1;
class We {
  id = vi++;
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
  #d = /* @__PURE__ */ new Set();
  is_fork = !1;
  #u = !1;
  constructor() {
    vt === null ? pr = vt = this : (vt.next = this, this.prev = vt), vt = this;
  }
  #h() {
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
    this.#l.has(t) || this.#l.set(t, { d: [], m: [] }), this.#d.delete(t);
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
        H(a, O), r(a);
      for (a of n.m)
        H(a, _e), r(a);
    }
    this.#d.add(t);
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
  #f() {
    var t = [];
    for (const i of this.#n)
      if (!((i.f & ee) !== 0 || (i.f & (O | _e)) === 0)) {
        for (var r = i, n = !1; r.parent !== null; ) {
          r = r.parent;
          var a = r.f;
          if ((a & (Ke | xe)) !== 0) {
            if ((a & J) === 0) {
              n = !0;
              break;
            }
            r.f ^= J;
          }
        }
        n || t.push(r);
      }
    return this.#n = [], t;
  }
  #_() {
    this.started = !0;
    for (const [l, o] of this.#a)
      H(l, o), this.schedule(l);
    this.apply();
    for (var t = Pt = [], r = [], n = ar = []; this.#n.length > 0; ) {
      rn++ > 1e3 && (this.#v(), hi());
      for (const l of this.#f())
        try {
          this.#k(l, t, r);
        } catch (o) {
          throw Bn(l), this.#h() || this.discard(), o;
        }
    }
    if (E = null, n.length > 0) {
      var a = We.ensure();
      for (const l of n)
        a.schedule(l);
    }
    if (Pt = null, ar = null, this.#h()) {
      this.#p(r), this.#p(t);
      for (const [l, o] of this.#l)
        Hn(l, o);
      n.length > 0 && /** @type {unknown} */
      E.#_();
      return;
    }
    const i = this.#b();
    if (i) {
      this.#p(r), this.#p(t), i.#c(this);
      return;
    }
    this.#a.clear();
    for (const l of this.#t) l(this);
    this.#t.clear(), mt = this, nn(r), nn(t), mt = null, this.#r?.resolve();
    var s = (
      /** @type {Batch | null} */
      /** @type {unknown} */
      E
    );
    this.#e === 0 && (this.#n.length === 0 || s !== null) && this.#v(), s !== null && (Ne.clear(), s.#_());
  }
  /**
   * Traverse the effect tree, executing effects or stashing
   * them for later execution as appropriate
   * @param {Effect} root
   * @param {Effect[]} effects
   * @param {Effect[]} render_effects
   */
  #k(t, r, n) {
    t.f ^= J;
    for (var a = t.first; a !== null; ) {
      var i = a.f, s = (i & (xe | Ke)) !== 0, l = s && (i & J) !== 0, o = l || (i & ae) !== 0 || this.#l.has(a);
      if (!o && a.fn !== null) {
        s ? a.f ^= J : (i & wt) !== 0 ? r.push(a) : Jt(a) && ((i & be) !== 0 && this.add_dirty_reaction(a, _e), Et(a));
        var f = a.first;
        if (f !== null) {
          a = f;
          continue;
        }
      }
      for (; a !== null; ) {
        var u = a.next;
        if (u !== null) {
          a = u;
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
      if (a !== null && !((n.f & ne) !== 0 && (n.f & (O | _e)) === 0))
        for (const l of a) {
          var i = l.f;
          if ((i & ne) !== 0)
            r(
              /** @type {Derived} */
              l
            );
          else {
            var s = (
              /** @type {Effect} */
              l
            );
            i & (pt | be) && !this.async_deriveds.has(s) && (this.#a.delete(s), H(s, O), this.schedule(s));
          }
        }
    };
    for (const n of this.current.keys())
      r(n);
    this.oncommit(() => t.discard()), t.#v(), E = this, this.#_();
  }
  /**
   * @param {Effect[]} effects
   */
  #p(t) {
    for (var r = 0; r < t.length; r += 1)
      Dn(t[r], this.#a);
  }
  /**
   * Associate a change to a given source with the current
   * batch, noting its previous and current values
   * @param {Value} source
   * @param {any} value
   * @param {boolean} [is_derived]
   */
  capture(t, r, n = !1) {
    t.v !== Z && !this.previous.has(t) && this.previous.set(t, t.v), (t.f & Ge) === 0 && (this.current.set(t, [r, n]), Me?.set(t, r)), this.is_fork || (t.v = r);
  }
  activate() {
    E = this;
  }
  deactivate() {
    E = null, Me = null;
  }
  flush() {
    try {
      gr = !0, E = this, this.#_();
    } finally {
      rn = 0, Ar = null, Pt = null, ar = null, gr = !1, E = null, Me = null, Ne.clear();
    }
  }
  discard() {
    for (const t of this.#o) t(this);
    this.#o.clear();
    for (const t of this.async_deriveds.values())
      t.reject(It);
    this.#v(), this.#r?.resolve();
  }
  /**
   * @param {Effect} effect
   */
  register_created_effect(t) {
    this.#i.push(t);
  }
  #w() {
    for (let v = pr; v !== null; v = v.next) {
      var t = v.id < this.id, r = [];
      for (const [_, [d, g]] of this.current) {
        if (v.current.has(_)) {
          var n = (
            /** @type {[any, boolean]} */
            v.current.get(_)[0]
          );
          if (t && d !== n)
            v.current.set(_, [d, g]);
          else
            continue;
        }
        r.push(_);
      }
      if (t)
        for (const [_, d] of this.async_deriveds) {
          const g = v.async_deriveds.get(_);
          g && d.promise.then(g.resolve).catch(g.reject);
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
            for (const _ of this.#d)
              v.unskip_effect(_, (d) => {
                (d.f & (be | pt)) !== 0 ? v.schedule(d) : v.#p([d]);
              });
          v.activate();
          var s = /* @__PURE__ */ new Set(), l = /* @__PURE__ */ new Map();
          for (var o of r)
            Vn(o, i, s, l);
          l = /* @__PURE__ */ new Map();
          var f = [...v.current].filter(([_, d]) => {
            const g = this.current.get(_);
            return g ? g[0] !== d[0] || g[1] !== d[1] : !0;
          }).map(([_]) => _);
          if (f.length > 0)
            for (const _ of this.#i)
              (_.f & (ee | ae | sr)) === 0 && Pr(_, f, l) && ((_.f & (pt | be)) !== 0 ? (H(_, O), v.schedule(_)) : v.add_dirty_reaction(_, O));
          if (v.#n.length > 0 && !v.#u) {
            v.apply();
            for (var u of v.#f())
              v.#k(u, [], []);
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
    this.#u || (this.#u = !0, Ye(() => {
      this.#u = !1, this.linked && this.flush();
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
    return (this.#r ??= Mn()).promise;
  }
  static ensure() {
    if (E === null) {
      const t = E = new We();
      !gr && !Ft && Ye(() => {
        t.started || t.flush();
      });
    }
    return E;
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
    if (Ar = t, t.b?.is_pending && (t.f & (wt | hr | En)) !== 0 && (t.f & xt) === 0) {
      t.b.defer_effect(t);
      return;
    }
    this.#n.push(t);
  }
  #v() {
    if (this.linked) {
      var t = this.prev, r = this.next;
      t === null ? pr = r : t.next = r, r === null ? vt = t : r.prev = t, this.linked = !1;
    }
  }
}
function di(e) {
  var t = Ft, r = mt;
  mt = null, Ft = !0;
  try {
    for (var n; ; ) {
      if (ai(), E === null)
        return (
          /** @type {T} */
          n
        );
      E.flush();
    }
  } finally {
    Ft = t, mt = r;
  }
}
function hi() {
  try {
    Qa();
  } catch (e) {
    ze(e, Ar);
  }
}
let je = null;
function nn(e) {
  var t = e.length;
  if (t !== 0) {
    for (var r = 0; r < t; ) {
      var n = e[r++];
      if ((n.f & (ee | ae)) === 0 && Jt(n) && (je = /* @__PURE__ */ new Set(), Et(n), n.deps === null && n.first === null && n.nodes === null && n.teardown === null && n.ac === null && ta(n), je?.size > 0)) {
        Ne.clear();
        for (const a of je) {
          if ((a.f & (ee | ae)) !== 0) continue;
          const i = [a];
          let s = a.parent;
          for (; s !== null; )
            je.has(s) && (je.delete(s), i.push(s)), s = s.parent;
          for (let l = i.length - 1; l >= 0; l--) {
            const o = i[l];
            (o.f & (ee | ae)) === 0 && Et(o);
          }
        }
        je.clear();
      }
    }
    je = null;
  }
}
function Vn(e, t, r, n) {
  if (!r.has(e) && (r.add(e), e.reactions !== null))
    for (const a of e.reactions) {
      const i = a.f;
      (i & ne) !== 0 ? Vn(
        /** @type {Derived} */
        a,
        t,
        r,
        n
      ) : (i & (pt | be)) !== 0 && (i & O) === 0 && Pr(a, t, n) && (H(a, O), Vr(
        /** @type {Effect} */
        a
      ));
    }
}
function Pr(e, t, r) {
  const n = r.get(e);
  if (n !== void 0) return n;
  if (e.deps !== null)
    for (const a of e.deps) {
      if (Bt.call(t, a))
        return !0;
      if ((a.f & ne) !== 0 && Pr(
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
function Vr(e) {
  E.schedule(e);
}
function Hn(e, t) {
  if (!((e.f & xe) !== 0 && (e.f & J) !== 0)) {
    (e.f & O) !== 0 ? t.d.push(e) : (e.f & _e) !== 0 && t.m.push(e), H(e, J);
    for (var r = e.first; r !== null; )
      Hn(r, t), r = r.next;
  }
}
function Bn(e) {
  H(e, J);
  for (var t = e.first; t !== null; )
    Bn(t), t = t.next;
}
let ur = /* @__PURE__ */ new Set();
const Ne = /* @__PURE__ */ new Map();
let Un = !1;
function lt(e, t) {
  var r = {
    f: 0,
    v: e,
    reactions: null,
    equals: qn,
    rv: 0,
    wv: 0
  };
  return r;
}
// @__NO_SIDE_EFFECTS__
function Y(e, t) {
  const r = lt(e);
  return aa(r), r;
}
// @__NO_SIDE_EFFECTS__
function _i(e, t = !1, r = !0) {
  const n = lt(e);
  return t || (n.equals = zn), n;
}
function N(e, t, r = !1) {
  S !== null && // since we are untracking the function inside `$inspect.with` we need to add this check
  // to ensure we error if state is set inside an inspect effect
  (!Ee || (S.f & sr) !== 0) && Nn() && (S.f & (ne | be | pt | sr)) !== 0 && (Oe === null || !Oe.has(e)) && ri();
  let n = r ? tt(t) : t;
  return Mt(e, n, ar);
}
var $e = null, Tr = 0;
function Mt(e, t, r = null) {
  if (!e.equals(t)) {
    Pe ? Ne.set(e, t) : Ne.has(e) || Ne.set(e, e.v);
    var n = We.ensure();
    if (n.capture(e, t), (e.f & ne) !== 0) {
      const a = (
        /** @type {Derived} */
        e
      );
      (e.f & O) !== 0 && Fr(a), Me === null && jr(a);
    }
    e.wv = sa(), $e = null, Tr = 0, Yn(e, O, r), $e = null, z !== null && (z.f & J) !== 0 && (z.f & (xe | Ke)) === 0 && (ge === null ? Ti([e]) : ge.push(e)), !n.is_fork && ur.size > 0 && !Un && pi();
  }
  return t;
}
function pi() {
  Un = !1;
  for (const e of ur) {
    (e.f & J) !== 0 && H(e, _e);
    let t;
    try {
      t = Jt(e);
    } catch {
      t = !0;
    }
    t && Et(e);
  }
  ur.clear();
}
function Vt(e) {
  N(e, e.v + 1);
}
function Yn(e, t, r) {
  var n = e.reactions;
  if (n !== null) {
    var a = n.length;
    if (Tr += a, Tr > 1e5 && $e === null && ($e = /* @__PURE__ */ new Set()), $e !== null) {
      if ($e.has(e)) return;
      $e.add(e);
    }
    for (var i = 0; i < a; i++) {
      var s = n[i], l = s.f, o = (l & O) === 0;
      if (o && H(s, t), (l & sr) !== 0)
        ur.add(
          /** @type {Effect} */
          s
        );
      else if ((l & ne) !== 0) {
        var f = (
          /** @type {Derived} */
          s
        );
        Me?.delete(f), Yn(f, _e, r);
      } else if (o) {
        var u = (
          /** @type {Effect} */
          s
        );
        (l & be) !== 0 && je !== null && je.add(u), r !== null ? r.push(u) : Vr(u);
      }
    }
  }
}
function tt(e) {
  if (typeof e != "object" || e === null || gt in e || Cn in e)
    return e;
  const t = bn(e);
  if (t !== Ca && t !== xa)
    return e;
  var r = /* @__PURE__ */ new Map(), n = vr(e), a = /* @__PURE__ */ Y(0), i = at, s = (l) => {
    if (at === i)
      return l();
    var o = S, f = at;
    we(null), on(i);
    var u = l();
    return we(o), on(f), u;
  };
  return n && r.set("length", /* @__PURE__ */ Y(
    /** @type {any[]} */
    e.length
  )), new Proxy(
    /** @type {any} */
    e,
    {
      defineProperty(l, o, f) {
        (!("value" in f) || f.configurable === !1 || f.enumerable === !1 || f.writable === !1) && ei();
        var u = r.get(o);
        return u === void 0 ? s(() => {
          var v = /* @__PURE__ */ Y(f.value);
          return r.set(o, v), v;
        }) : N(u, f.value, !0), !0;
      },
      deleteProperty(l, o) {
        var f = r.get(o);
        if (f === void 0) {
          if (o in l) {
            const u = s(() => /* @__PURE__ */ Y(Z));
            r.set(o, u), Vt(a);
          }
        } else
          N(f, Z), Vt(a);
        return !0;
      },
      get(l, o, f) {
        if (o === gt)
          return e;
        var u = r.get(o), v = o in l;
        if (u === void 0 && (!v || _t(l, o)?.writable) && (u = s(() => {
          var d = tt(v ? l[o] : Z), g = /* @__PURE__ */ Y(d);
          return g;
        }), r.set(o, u)), u !== void 0) {
          var _ = h(u);
          return _ === Z ? void 0 : _;
        }
        return Reflect.get(l, o, f);
      },
      getOwnPropertyDescriptor(l, o) {
        this.has?.(l, o);
        var f = Reflect.getOwnPropertyDescriptor(l, o), u = r.get(o);
        if (u !== void 0) {
          var v = h(u);
          if (v === Z)
            return;
          if (f && "value" in f)
            f.value = v;
          else
            return {
              enumerable: !0,
              configurable: !0,
              value: v,
              writable: !0
            };
        }
        return f;
      },
      has(l, o) {
        if (o === gt)
          return !0;
        var f = r.get(o), u = f !== void 0 && f.v !== Z || Reflect.has(l, o);
        if (f !== void 0 || (z !== null || S !== null) && (!u || _t(l, o)?.writable)) {
          f === void 0 && (f = s(() => {
            var _ = u ? tt(l[o]) : Z, d = /* @__PURE__ */ Y(_);
            return d;
          }), r.set(o, f));
          var v = h(f);
          if (v === Z)
            return !1;
        }
        return u;
      },
      set(l, o, f, u) {
        var v = r.get(o), _ = o in l;
        if (n && o === "length")
          for (var d = f; d < /** @type {Source<number>} */
          v.v; d += 1) {
            var g = r.get(d + "");
            g !== void 0 ? N(g, Z) : d in l && (g = s(() => /* @__PURE__ */ Y(Z)), r.set(d + "", g));
          }
        if (v === void 0)
          (!_ || _t(l, o)?.writable) && (v = s(() => /* @__PURE__ */ Y(void 0)), N(v, tt(f)), r.set(o, v));
        else {
          _ = v.v !== Z;
          var y = s(() => tt(f));
          N(v, y);
        }
        var m = Reflect.getOwnPropertyDescriptor(l, o);
        if (m?.set && m.set.call(u, f), !_) {
          if (n && typeof o == "string") {
            var b = (
              /** @type {Source<number>} */
              r.get("length")
            ), x = Number(o);
            Number.isInteger(x) && x >= b.v && N(b, x + 1);
          }
          Vt(a);
        }
        return !0;
      },
      ownKeys(l) {
        h(a);
        var o = Reflect.ownKeys(l).filter((v) => {
          var _ = r.get(v);
          return _ === void 0 || _.v !== Z;
        });
        for (var [f, u] of r)
          u.v !== Z && !(f in l) && o.push(f);
        return o;
      },
      setPrototypeOf() {
        ti();
      }
    }
  );
}
function an(e) {
  try {
    if (e !== null && typeof e == "object" && gt in e)
      return e[gt];
  } catch {
  }
  return e;
}
function Gn(e, t) {
  return Object.is(an(e), an(t));
}
var sn, Kn, Wn, Zn;
function gi() {
  if (sn === void 0) {
    sn = window, Kn = /Firefox/.test(navigator.userAgent);
    var e = Element.prototype, t = Node.prototype, r = Text.prototype;
    Wn = _t(t, "firstChild").get, Zn = _t(t, "nextSibling").get, en(e) && (e[Cr] = void 0, e[xn] = null, e[xr] = void 0, e.__e = void 0), en(r) && (r[Sr] = void 0);
  }
}
function Fe(e = "") {
  return document.createTextNode(e);
}
// @__NO_SIDE_EFFECTS__
function qe(e) {
  return (
    /** @type {TemplateNode | null} */
    Wn.call(e)
  );
}
// @__NO_SIDE_EFFECTS__
function Xt(e) {
  return (
    /** @type {TemplateNode | null} */
    Zn.call(e)
  );
}
function C(e, t) {
  return /* @__PURE__ */ qe(e);
}
function Ue(e, t = !1) {
  {
    var r = /* @__PURE__ */ qe(e);
    return r instanceof Comment && r.data === "" ? /* @__PURE__ */ Xt(r) : r;
  }
}
function F(e, t = !1) {
  return /* @__PURE__ */ qe(e);
}
function w(e, t = 1, r = !1) {
  let n = e;
  for (; t--; )
    n = /** @type {TemplateNode} */
    /* @__PURE__ */ Xt(n);
  return n;
}
function mi(e) {
  e.textContent = "";
}
function Xn() {
  return !1;
}
function ki(e, t, r) {
  return (
    /** @type {T extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[T] : Element} */
    r ? document.createElement(e, { is: r }) : document.createElement(e)
  );
}
function wi(e) {
  var t = z;
  if (t === null)
    return S.f |= Ge, e;
  if ((t.f & xt) === 0 && (t.f & wt) === 0)
    throw e;
  ze(e, t);
}
function ze(e, t) {
  if (e === Tn)
    throw e;
  if (!(t !== null && (t.f & ee) !== 0)) {
    for (; t !== null; ) {
      if ((t.f & Er) !== 0 && (t.f & (ee | ir)) === 0) {
        if ((t.f & xt) === 0)
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
function yi(e) {
  z === null && (S === null && Ja(), Xa()), Pe && Za();
}
function bi(e, t) {
  var r = t.last;
  r === null ? t.last = t.first = e : (r.next = e, e.prev = r, t.last = e);
}
function Ve(e, t) {
  var r = z;
  r !== null && (r.f & ae) !== 0 && (e |= ae);
  var n = {
    ctx: ue,
    deps: null,
    nodes: null,
    f: e | O | Ce,
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
  E?.register_created_effect(n);
  var a = n;
  if ((e & wt) !== 0)
    Pt !== null ? Pt.push(n) : We.ensure().schedule(n);
  else if (t !== null) {
    try {
      Et(n);
    } catch (s) {
      throw fe(n), s;
    }
    a.deps === null && a.teardown === null && a.nodes === null && a.first === a.last && // either `null`, or a singular child
    (a.f & St) === 0 && (a = a.first, (e & be) !== 0 && (e & yt) !== 0 && a !== null && (a.f |= yt));
  }
  if (a !== null && (a.parent = r, r !== null && bi(a, r), S !== null && (S.f & ne) !== 0 && (e & Ke) === 0)) {
    var i = (
      /** @type {Derived} */
      S
    );
    (i.effects ??= []).push(a);
  }
  return n;
}
function Hr() {
  return S !== null && !Ee;
}
function Jn(e) {
  const t = Ve(hr, null);
  return H(t, J), t.teardown = e, t;
}
function Mi(e) {
  yi();
  var t = (
    /** @type {Effect} */
    z.f
  ), r = !S && (t & xe) !== 0 && ue !== null && !ue.i;
  if (r) {
    var n = (
      /** @type {ComponentContext} */
      ue
    );
    (n.e ??= []).push(e);
  } else
    return Qn(e);
}
function Qn(e) {
  return Ve(wt | qa, e);
}
function Ei(e) {
  We.ensure();
  const t = Ve(Ke | St, e);
  return (r = {}) => new Promise((n) => {
    r.outro ? nt(t, () => {
      fe(t), n(void 0);
    }) : (fe(t), n(void 0));
  });
}
function Ci(e) {
  return Ve(wt, e);
}
function xi(e) {
  return Ve(pt | St, e);
}
function $n(e, t = 0) {
  return Ve(hr | t, e);
}
function G(e, t = [], r = [], n = []) {
  li(n, t, r, (a) => {
    Ve(hr, () => {
      e(...a.map(h));
    });
  });
}
function _r(e, t = 0) {
  var r = Ve(be | t, e);
  return r;
}
function ke(e) {
  return Ve(xe | St, e);
}
function ea(e) {
  var t = e.teardown;
  if (t !== null) {
    const r = Pe, n = S;
    ln(!0), we(null);
    try {
      t.call(null);
    } catch (a) {
      ze(a, e.parent);
    } finally {
      ln(r), we(n);
    }
  }
}
function Br(e, t = !1) {
  var r = e.first;
  for (e.first = e.last = null; r !== null; ) {
    const a = r.ac;
    a !== null && Zt(() => {
      a.abort(Gt);
    });
    var n = r.next;
    (r.f & Ke) !== 0 ? r.parent = null : fe(r, t), r = n;
  }
}
function Si(e) {
  for (var t = e.first; t !== null; ) {
    var r = t.next;
    (t.f & xe) === 0 && fe(t), t = r;
  }
}
function fe(e, t = !0) {
  var r = !1;
  (t || (e.f & Ta) !== 0) && e.nodes !== null && e.nodes.end !== null && (Ai(
    e.nodes.start,
    /** @type {TemplateNode} */
    e.nodes.end
  ), r = !0), e.f |= ir, Br(e, t && !r), Yt(e, 0);
  var n = e.nodes && e.nodes.t;
  if (n !== null)
    for (const i of n)
      i.stop();
  ea(e), e.f ^= ir, e.f |= ee;
  var a = e.parent;
  a !== null && a.first !== null && ta(e), e.next = e.prev = e.teardown = e.ctx = e.deps = e.fn = e.nodes = e.ac = e.b = null;
}
function Ai(e, t) {
  for (; e !== null; ) {
    var r = e === t ? null : /* @__PURE__ */ Xt(e);
    e.remove(), e = r;
  }
}
function ta(e) {
  var t = e.parent, r = e.prev, n = e.next;
  r !== null && (r.next = n), n !== null && (n.prev = r), t !== null && (t.first === e && (t.first = n), t.last === e && (t.last = r));
}
function nt(e, t, r = !0) {
  var n = [];
  e.f |= Lr, ra(e, n, !0);
  var a = () => {
    r && fe(e), t && t();
  }, i = n.length;
  if (i > 0) {
    var s = () => --i || a();
    for (var l of n)
      l.out(s);
  } else
    a();
}
function ra(e, t, r) {
  if ((e.f & ae) === 0) {
    e.f ^= ae;
    var n = e.nodes && e.nodes.t;
    if (n !== null)
      for (const l of n)
        (l.is_global || r) && t.push(l);
    for (var a = e.first; a !== null; ) {
      var i = a.next;
      if ((a.f & Ke) === 0) {
        var s = (a.f & yt) !== 0 || // If this is a branch effect without a block effect parent,
        // it means the parent block effect was pruned. In that case,
        // transparency information was transferred to the branch effect.
        (a.f & xe) !== 0 && (e.f & be) !== 0;
        ra(a, t, s ? r : !1);
      }
      a = i;
    }
  }
}
function fr(e) {
  e.f &= ~Lr, na(e, !0);
}
function na(e, t) {
  if ((e.f & Lr) === 0 && (e.f & ae) !== 0) {
    e.f ^= ae, (e.f & J) === 0 && (H(e, O), We.ensure().schedule(e));
    for (var r = e.first; r !== null; ) {
      var n = r.next, a = (r.f & yt) !== 0 || (r.f & xe) !== 0;
      na(r, a ? t : !1), r = n;
    }
    var i = e.nodes && e.nodes.t;
    if (i !== null)
      for (const s of i)
        (s.is_global || t) && s.in();
  }
}
function Ur(e, t) {
  if (e.nodes)
    for (var r = e.nodes.start, n = e.nodes.end; r !== null; ) {
      var a = r === n ? null : /* @__PURE__ */ Xt(r);
      t.append(r), r = a;
    }
}
let Pe = !1;
function ln(e) {
  Pe = e;
}
let S = null, Ee = !1;
function we(e) {
  S = e;
}
let z = null;
function De(e) {
  z = e;
}
let Oe = null;
function aa(e) {
  S !== null && ((S.f & lr) !== 0 || (S.f & ne) !== 0) && (Oe ??= /* @__PURE__ */ new Set()).add(e);
}
let oe = null, de = 0, ge = null;
function Ti(e) {
  ge = e;
}
let ia = 1, rt = 0, at = rt;
function on(e) {
  at = e;
}
function sa() {
  return ++ia;
}
function Jt(e) {
  var t = e.f;
  if ((t & O) !== 0)
    return !0;
  if ((t & _e) !== 0) {
    for (var r = (
      /** @type {Value[]} */
      e.deps
    ), n = r.length, a = 0; a < n; a++) {
      var i = r[a];
      if (Jt(
        /** @type {Derived} */
        i
      ) && Fn(
        /** @type {Derived} */
        i
      ), i.wv > e.wv)
        return !0;
    }
    (t & Ce) !== 0 && // During time traveling we don't want to reset the status so that
    // traversal of the graph in the other batches still happens
    Me === null && H(e, J);
  }
  return !1;
}
function la(e, t, r = !0) {
  var n = e.reactions;
  if (n !== null && !(Oe !== null && Oe.has(e)))
    for (var a = 0; a < n.length; a++) {
      var i = n[a];
      (i.f & ne) !== 0 ? la(
        /** @type {Derived} */
        i,
        t,
        !1
      ) : t === i && (r ? H(i, O) : (i.f & J) !== 0 && H(i, _e), Vr(
        /** @type {Effect} */
        i
      ));
    }
}
function oa(e) {
  var t = oe, r = de, n = ge, a = S, i = Oe, s = ue, l = Ee, o = at, f = e.f;
  oe = /** @type {null | Value[]} */
  null, de = 0, ge = null, S = (f & (xe | Ke)) === 0 ? e : null, Oe = null, bt(e.ctx), Ee = !1, at = ++rt, e.ac !== null && (Zt(() => {
    e.ac.abort(Gt);
  }), e.ac = null);
  try {
    e.f |= lr;
    var u = (
      /** @type {Function} */
      e.fn
    ), v = u();
    e.f |= xt;
    var _ = un(e);
    if (Nn() && ge !== null && !Ee && _ !== null && (e.f & (ne | _e | O)) === 0)
      for (var d = 0; d < /** @type {Source[]} */
      ge.length; d++)
        la(
          ge[d],
          /** @type {Effect} */
          e
        );
    if (a !== null && a !== e) {
      if (rt++, a.deps !== null)
        for (let g = 0; g < r; g += 1)
          a.deps[g].rv = rt;
      if (t !== null)
        for (const g of t)
          g.rv = rt;
      ge !== null && (n === null ? n = ge : n.push(.../** @type {Source[]} */
      ge));
    }
    return (e.f & Ge) !== 0 && (e.f ^= Ge), v;
  } catch (g) {
    return un(e), wi(g);
  } finally {
    e.f ^= lr, oe = t, de = r, ge = n, S = a, Oe = i, bt(s), Ee = l, at = o;
  }
}
function un(e) {
  var t = e.deps, r = E?.is_fork;
  if (oe !== null) {
    var n;
    if (r || Yt(e, de), t !== null && de > 0)
      for (t.length = de + oe.length, n = 0; n < oe.length; n++)
        t[de + n] = oe[n];
    else
      e.deps = t = oe;
    if (Hr() && (e.f & Ce) !== 0)
      for (n = de; n < t.length; n++)
        (t[n].reactions ??= []).push(e);
  } else !r && t !== null && de < t.length && (Yt(e, de), t.length = de);
  return t;
}
function qi(e, t) {
  let r = t.reactions;
  if (r !== null) {
    var n = Ma.call(r, e);
    if (n !== -1) {
      var a = r.length - 1;
      a === 0 ? r = t.reactions = null : (r[n] = r[a], r.pop());
    }
  }
  if (r === null && (t.f & ne) !== 0 && // Destroying a child effect while updating a parent effect can cause a dependency to appear
  // to be unused, when in fact it is used by the currently-updating parent. Checking `new_deps`
  // allows us to skip the expensive work of disconnecting and immediately reconnecting it
  (oe === null || !Bt.call(oe, t))) {
    var i = (
      /** @type {Derived} */
      t
    );
    (i.f & Ce) !== 0 && (i.f ^= Ce), i.v !== Z && jr(i), i.ac !== null && Zt(() => {
      i.ac.abort(Gt), i.ac = null, H(i, O);
    }), ci(i), Yt(i, 0);
  }
}
function Yt(e, t) {
  var r = e.deps;
  if (r !== null)
    for (var n = t; n < r.length; n++)
      qi(e, r[n]);
}
function Et(e) {
  var t = e.f;
  if ((t & ee) === 0) {
    H(e, J);
    var r = z;
    z = e;
    try {
      (t & (be | En)) !== 0 ? Si(e) : Br(e), ea(e);
      var n = oa(e);
      e.teardown = typeof n == "function" ? n : null, e.wv = ia;
      var a;
    } finally {
      z = r;
    }
  }
}
async function zi() {
  await Promise.resolve(), di();
}
function h(e) {
  var t = e.f, r = (t & ne) !== 0;
  if (S !== null && !Ee) {
    var n = z !== null && (z.f & ee) !== 0;
    if (!n && (Oe === null || !Oe.has(e))) {
      var a = S.deps;
      if ((S.f & lr) !== 0)
        e.rv < rt && (e.rv = rt, oe === null && a !== null && a[de] === e ? de++ : oe === null ? oe = [e] : oe.push(e));
      else {
        S.deps ??= [], Bt.call(S.deps, e) || S.deps.push(e);
        var i = e.reactions;
        i === null ? e.reactions = [S] : Bt.call(i, S) || i.push(S);
      }
    }
  }
  if (Pe && Ne.has(e))
    return Ne.get(e);
  if (r) {
    var s = (
      /** @type {Derived} */
      e
    );
    if (Pe) {
      var l = s.v;
      return ((s.f & J) === 0 && s.reactions !== null || fa(s)) && (l = Fr(s)), Ne.set(s, l), l;
    }
    var o = (s.f & Ce) === 0 && !Ee && S !== null && (S.f & Ce) !== 0, f = (s.f & xt) === 0;
    Jt(s) && (o && (s.f |= Ce), Fn(s)), o && !f && (Pn(s), ua(s));
  }
  if (Me?.has(e))
    return Me.get(e);
  if ((e.f & Ge) !== 0)
    throw e.v;
  return e.v;
}
function ua(e) {
  if (e.f |= Ce, e.deps !== null)
    for (const r of e.deps) {
      var t = r.reactions;
      t === null ? r.reactions = [e] : Bt.call(t, e) || t.push(e), (r.f & ne) !== 0 && (r.f & Ce) === 0 && (Pn(
        /** @type {Derived} */
        r
      ), ua(
        /** @type {Derived} */
        r
      ));
    }
}
function fa(e) {
  if (e.v === Z) return !0;
  if (e.deps === null) return !1;
  for (const t of e.deps)
    if (Ne.has(t) || (t.f & ne) !== 0 && fa(
      /** @type {Derived} */
      t
    ))
      return !0;
  return !1;
}
function Yr(e) {
  var t = Ee;
  try {
    return Ee = !0, e();
  } finally {
    Ee = t;
  }
}
const Ri = ["touchstart", "touchmove"];
function Ni(e) {
  return Ri.includes(e);
}
const Lt = /* @__PURE__ */ Symbol("events"), ca = /* @__PURE__ */ new Set(), qr = /* @__PURE__ */ new Set();
function Te(e, t, r) {
  (t[Lt] ??= {})[e] = r;
}
function Gr(e) {
  for (var t = 0; t < e.length; t++)
    ca.add(e[t]);
  for (var r of qr)
    r(e);
}
let mr = null, kr = !1;
function fn(e) {
  var t = this, r = (
    /** @type {Node} */
    t.ownerDocument
  ), n = e.type, a = e.composedPath?.() || [], i = (
    /** @type {null | Element} */
    a[0] || e.target
  );
  mr = e, kr || (kr = !0, setTimeout(() => {
    kr = !1, mr = null;
  }));
  var s = 0, l = mr === e && e[Lt];
  if (l) {
    var o = a.indexOf(l);
    if (o !== -1 && (t === document || t === /** @type {any} */
    window)) {
      e[Lt] = t;
      return;
    }
    var f = a.indexOf(t);
    if (f === -1)
      return;
    o <= f && (s = o);
  }
  if (i = /** @type {Element} */
  a[s] || e.target, i !== t) {
    yn(e, "currentTarget", {
      configurable: !0,
      get() {
        return i || r;
      }
    });
    var u = S, v = z;
    we(null), De(null);
    try {
      for (var _, d = []; i !== null && i !== t; ) {
        try {
          var g = i[Lt]?.[n];
          g != null && (!/** @type {any} */
          i.disabled || // DOM could've been updated already by the time this is reached, so we check this as well
          // -> the target could not have been disabled because it emits the event in the first place
          e.target === i) && g.call(i, e);
        } catch (y) {
          _ ? d.push(y) : _ = y;
        }
        if (e.cancelBubble) break;
        s++, i = s < a.length ? (
          /** @type {Element} */
          a[s]
        ) : null;
      }
      if (_) {
        for (let y of d)
          queueMicrotask(() => {
            throw y;
          });
        throw _;
      }
    } finally {
      e[Lt] = t, delete e.currentTarget, we(u), De(v);
    }
  }
}
const Oi = (
  // We gotta write it like this because after downleveling the pure comment may end up in the wrong location
  globalThis?.window?.trustedTypes && /* @__PURE__ */ globalThis.window.trustedTypes.createPolicy("svelte-trusted-html", {
    /** @param {string} html */
    createHTML: (e) => e
  })
);
function Di(e) {
  return (
    /** @type {string} */
    Oi?.createHTML(e) ?? e
  );
}
function va(e) {
  var t = ki("template");
  return t.innerHTML = Di(e.replaceAll("<!>", "<!---->")), t.content;
}
function Ct(e, t) {
  var r = (
    /** @type {Effect} */
    z
  );
  r.nodes === null && (r.nodes = { start: e, end: t, a: null, t: null });
}
// @__NO_SIDE_EFFECTS__
function Q(e, t) {
  var r = (t & An) !== 0, n = (t & Va) !== 0, a, i = !e.startsWith("<!>");
  return () => {
    a === void 0 && (a = va(i ? e : "<!>" + e), r || (a = /** @type {TemplateNode} */
    /* @__PURE__ */ qe(a)));
    var s = (
      /** @type {TemplateNode} */
      n || Kn ? document.importNode(a, !0) : a.cloneNode(!0)
    );
    if (r) {
      var l = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ qe(s)
      ), o = (
        /** @type {TemplateNode} */
        s.lastChild
      );
      Ct(l, o);
    } else
      Ct(s, s);
    return s;
  };
}
// @__NO_SIDE_EFFECTS__
function Ii(e, t, r = "svg") {
  var n = !e.startsWith("<!>"), a = (t & An) !== 0, i = `<${r}>${n ? e : "<!>" + e}</${r}>`, s;
  return () => {
    if (!s) {
      var l = (
        /** @type {DocumentFragment} */
        va(i)
      ), o = (
        /** @type {Element} */
        /* @__PURE__ */ qe(l)
      );
      if (a)
        for (s = document.createDocumentFragment(); /* @__PURE__ */ qe(o); )
          s.appendChild(
            /** @type {TemplateNode} */
            /* @__PURE__ */ qe(o)
          );
      else
        s = /** @type {Element} */
        /* @__PURE__ */ qe(o);
    }
    var f = (
      /** @type {TemplateNode} */
      s.cloneNode(!0)
    );
    if (a) {
      var u = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ qe(f)
      ), v = (
        /** @type {TemplateNode} */
        f.lastChild
      );
      Ct(u, v);
    } else
      Ct(f, f);
    return f;
  };
}
// @__NO_SIDE_EFFECTS__
function M(e, t) {
  return /* @__PURE__ */ Ii(e, t, "svg");
}
function cn(e = "") {
  {
    var t = Fe(e + "");
    return Ct(t, t), t;
  }
}
function Li() {
  var e = document.createDocumentFragment(), t = document.createComment(""), r = Fe();
  return e.append(t, r), Ct(t, r), e;
}
function k(e, t) {
  e !== null && e.before(
    /** @type {Node} */
    t
  );
}
function ji() {
  return (window.__svelte ??= {}).uid ??= 1, `c${window.__svelte.uid++}`;
}
function Fi(e) {
  let t = 0, r = lt(0), n;
  return () => {
    Hr() && (h(r), $n(() => (t === 0 && (n = Yr(() => e(() => Vt(r)))), t += 1, () => {
      Ye(() => {
        t -= 1, t === 0 && (n?.(), n = void 0, Vt(r));
      });
    })));
  };
}
var Pi = yt | St;
function Vi(e, t, r, n) {
  new Hi(e, t, r, n);
}
class Hi {
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
  #d = 0;
  #u = 0;
  #h = !1;
  /** @type {Map<Effect, number>} */
  #g = /* @__PURE__ */ new Map();
  /**
   * A source containing the number of pending async deriveds/expressions.
   * Only created if `$effect.pending()` is used inside the boundary,
   * otherwise updating the source results in needless `Batch.ensure()`
   * calls followed by no-op flushes
   * @type {Source<number> | null}
   */
  #f = null;
  #_ = Fi(() => (this.#f = lt(this.#d), () => {
    this.#f = null;
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
        z
      );
      s.b = this, s.f |= Er, n(i);
    }, this.parent = /** @type {Effect} */
    z.b, this.transform_error = a ?? this.parent?.transform_error ?? ((i) => i), this.#r = _r(() => {
      this.#w();
    }, Pi);
  }
  #k() {
    try {
      this.#n = ke(() => this.#s(this.#t));
    } catch (t) {
      this.error(t);
    }
  }
  /**
   * @param {unknown} error The deserialized error from the server's hydration comment
   */
  #b(t) {
    const r = this.#e.failed, { reset: n, invoke_onerror: a } = this.#m(t);
    Ye(a), r && (this.#a = ke(() => {
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
          Ya();
          return;
        }
        r = !0, n && ni(), this.#a !== null && nt(this.#a, () => {
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
    return (this.#r.f & (ee | ir)) !== 0;
  }
  #p() {
    const t = this.#e.pending;
    t && (this.is_pending = !0, this.#i = ke(() => t(this.#t)), Ye(() => {
      if (!this.#c()) {
        var r = this.#l = document.createDocumentFragment(), n = Fe(), a = !1;
        if (r.append(n), this.#n = this.#y(() => {
          try {
            return ke(() => this.#s(n));
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
            E
          );
          return;
        }
        this.#u === 0 && (this.#t.before(r), this.#l = null, nt(
          /** @type {Effect} */
          this.#i,
          () => {
            this.#i = null;
          }
        ), this.#v(
          /** @type {Batch} */
          E
        ));
      }
    }));
  }
  #w() {
    try {
      if (this.is_pending = this.has_pending_snippet(), this.#u = 0, this.#d = 0, this.#n = ke(() => {
        this.#s(this.#t);
      }), this.#u > 0) {
        var t = this.#l = document.createDocumentFragment();
        Ur(this.#n, t);
        const r = (
          /** @type {(anchor: Node) => void} */
          this.#e.pending
        );
        this.#i = ke(() => r(this.#t));
      } else
        this.#v(
          /** @type {Batch} */
          E
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
    Dn(t, this.#g);
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
    var r = z, n = S, a = ue;
    De(this.#r), we(this.#r), bt(this.#r.ctx);
    try {
      return We.ensure(), t();
    } finally {
      De(r), we(n), bt(a);
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
    this.#u += t, this.#u === 0 && (this.#v(r), this.#i && nt(this.#i, () => {
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
    this.#M(t, r), this.#d += t, !(!this.#f || this.#h) && (this.#h = !0, Ye(() => {
      this.#h = !1, this.#f && Mt(this.#f, this.#d);
    }));
  }
  get_effect_pending() {
    return this.#_(), h(
      /** @type {Source<number>} */
      this.#f
    );
  }
  /** @param {unknown} error */
  error(t) {
    if (t === Tn || !this.#e.onerror && !this.#e.failed)
      throw t;
    E?.is_fork ? (this.#n && E.skip_effect(this.#n), this.#i && E.skip_effect(this.#i), this.#a && E.skip_effect(this.#a), E.oncommit(() => {
      this.#c() || this.#E(t);
    })) : this.#E(t);
  }
  /**
   * @param {unknown} error
   */
  #E(t) {
    this.#n && (fe(this.#n), this.#n = null), this.#i && (fe(this.#i), this.#i = null), this.#a && (fe(this.#a), this.#a = null);
    let r = this.#e.failed;
    const n = (a) => {
      if (this.#c()) return;
      const { reset: i, invoke_onerror: s } = this.#m(a);
      s(), r && !this.#c() && (this.#a = this.#y(() => {
        try {
          return ke(() => {
            var l = (
              /** @type {Effect} */
              z
            );
            l.b = this, l.f |= Er, r(
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
function R(e, t) {
  var r = t == null ? "" : typeof t == "object" ? `${t}` : t;
  r !== /** @type {any} */
  (e[Sr] ??= e.nodeValue) && (e[Sr] = r, e.nodeValue = `${r}`);
}
function Bi(e, t) {
  return Ui(e, t);
}
const tr = /* @__PURE__ */ new Map();
function Ui(e, { target: t, anchor: r, props: n = {}, events: a, context: i, intro: s = !0, transformError: l }) {
  gi();
  var o = void 0, f = Ei(() => {
    var u = r ?? t.appendChild(Fe());
    Vi(
      /** @type {TemplateNode} */
      u,
      {
        pending: () => {
        }
      },
      (d) => {
        Kt({});
        var g = (
          /** @type {ComponentContext} */
          ue
        );
        i && (g.c = i), a && (n.$$events = a), o = e(d, n) || Rn(), Wt();
      },
      l
    );
    var v = /* @__PURE__ */ new Set(), _ = (d) => {
      for (var g = 0; g < d.length; g++) {
        var y = d[g];
        if (!v.has(y)) {
          v.add(y);
          var m = Ni(y);
          for (const D of [t, document]) {
            var b = tr.get(D);
            b === void 0 && (b = /* @__PURE__ */ new Map(), tr.set(D, b));
            var x = b.get(y);
            x === void 0 ? (D.addEventListener(y, fn, { passive: m }), b.set(y, 1)) : b.set(y, x + 1);
          }
        }
      }
    };
    return _(dr(ca)), qr.add(_), () => {
      for (var d of v)
        for (const m of [t, document]) {
          var g = (
            /** @type {Map<string, number>} */
            tr.get(m)
          ), y = (
            /** @type {number} */
            g.get(d)
          );
          --y == 0 ? (m.removeEventListener(d, fn), g.delete(d), g.size === 0 && tr.delete(m)) : g.set(d, y);
        }
      qr.delete(_), u !== r && u.parentNode?.removeChild(u);
    };
  });
  return zr.set(o, f), o;
}
let zr = /* @__PURE__ */ new WeakMap();
function Yi(e, t) {
  const r = zr.get(e);
  return r ? (zr.delete(e), r(t)) : Promise.resolve();
}
class da {
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
        fr(n), this.#s.delete(r);
      else {
        var a = this.#e.get(r);
        a && (fr(a.effect), this.#o.set(r, a.effect), this.#e.delete(r), a.fragment.lastChild.remove(), this.anchor.before(a.fragment), n = a.effect);
      }
      for (const [i, s] of this.#t) {
        if (this.#t.delete(i), i === t)
          break;
        const l = this.#e.get(s);
        l && (fe(l.effect), this.#e.delete(s));
      }
      for (const [i, s] of this.#o) {
        if (i === r || this.#s.has(i)) continue;
        const l = () => {
          if (Array.from(this.#t.values()).includes(i)) {
            var f = document.createDocumentFragment();
            Ur(s, f), f.append(Fe()), this.#e.set(i, { effect: s, fragment: f });
          } else
            fe(s);
          this.#s.delete(i), this.#o.delete(i);
        };
        this.#r || !n ? (this.#s.add(i), nt(s, l, !1)) : l();
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
      r.includes(n) || (fe(a.effect), this.#e.delete(n));
  };
  /**
   *
   * @param {any} key
   * @param {null | ((target: TemplateNode) => void)} fn
   */
  ensure(t, r) {
    var n = (
      /** @type {Batch} */
      E
    ), a = Xn();
    if (r && !this.#o.has(t) && !this.#e.has(t))
      if (a) {
        var i = document.createDocumentFragment(), s = Fe();
        i.append(s), this.#e.set(t, {
          effect: ke(() => r(s)),
          fragment: i
        });
      } else
        this.#o.set(
          t,
          ke(() => r(this.anchor))
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
function he(e, t, r = !1) {
  var n = new da(e), a = r ? yt : 0;
  function i(s, l) {
    n.ensure(s, l);
  }
  _r(() => {
    var s = !1;
    t((l, o = 0) => {
      s = !0, i(o, l);
    }), s || i(-1, null);
  }, a);
}
const Gi = /* @__PURE__ */ Symbol("NaN");
function Ki(e, t, r) {
  var n = new da(e);
  _r(() => {
    var a = t();
    a !== a && (a = /** @type {any} */
    Gi), n.ensure(a, r);
  });
}
function Rr(e, t) {
  return t;
}
function Wi(e, t, r) {
  for (var n = [], a = t.length, i, s = t.length, l = 0; l < a; l++) {
    let v = t[l];
    nt(
      v,
      () => {
        if (i) {
          if (i.pending.delete(v), i.done.add(v), i.pending.size === 0) {
            var _ = (
              /** @type {Set<EachOutroGroup>} */
              e.outrogroups
            );
            Nr(e, dr(i.done)), _.delete(i), _.size === 0 && (e.outrogroups = null);
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
      var f = (
        /** @type {Element} */
        r
      ), u = (
        /** @type {Element} */
        f.parentNode
      );
      mi(u), u.append(f), e.items.clear();
    }
    Nr(e, t, !o);
  } else
    i = {
      pending: new Set(t),
      done: /* @__PURE__ */ new Set()
    }, (e.outrogroups ??= /* @__PURE__ */ new Set()).add(i);
}
function Nr(e, t, r = !0) {
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
      i.f |= Re;
      const s = document.createDocumentFragment();
      Ur(i, s);
    } else
      fe(t[a], r);
  }
}
var vn;
function dt(e, t, r, n, a, i = null) {
  var s = e, l = /* @__PURE__ */ new Map(), o = (t & Sn) !== 0;
  if (o) {
    var f = (
      /** @type {Element} */
      e
    );
    s = f.appendChild(Fe());
  }
  var u = null, v = /* @__PURE__ */ jn(() => {
    var x = r();
    return (
      /** @type {V[]} */
      vr(x) ? x : x == null ? [] : dr(x)
    );
  }), _ = /* @__PURE__ */ new Map(), d = !0;
  function g(x) {
    if ((b.effect.f & ee) === 0) {
      b.pending.delete(x);
      var D = h(v);
      b.fallback = u, Zi(b, D, s, t, n), u !== null && (D.length === 0 ? (u.f & Re) === 0 ? fr(u) : (u.f ^= Re, jt(u, null, s)) : nt(u, () => {
        u = null;
      }));
    }
  }
  function y(x) {
    b.pending.delete(x);
  }
  var m = _r(() => {
    for (var x = (
      /** @type {V[]} */
      h(v)
    ), D = x.length, T = /* @__PURE__ */ new Set(), P = (
      /** @type {Batch} */
      E
    ), te = Xn(), B = 0; B < D; B += 1) {
      var ie = x[B], se = n(ie, B), L = d ? null : l.get(se);
      L ? (L.v && Mt(L.v, ie), L.i && Mt(L.i, B), te && P.unskip_effect(L.e)) : (L = Xi(
        l,
        d ? s : vn ??= Fe(),
        ie,
        se,
        B,
        a,
        t,
        r
      ), d || (L.e.f |= Re), l.set(se, L)), T.add(se);
    }
    if (D === 0 && i && !u && (d ? u = ke(() => i(s)) : (u = ke(() => i(vn ??= Fe())), u.f |= Re)), D > T.size && Wa(), !d)
      if (_.set(P, T), te) {
        for (const [Ze, Xe] of l)
          T.has(Ze) || P.skip_effect(Xe.e);
        P.oncommit(g), P.ondiscard(y);
      } else
        g(P);
    h(v);
  }), b = { effect: m, items: l, pending: _, outrogroups: null, fallback: u };
  d = !1;
}
function Dt(e) {
  for (; e !== null && (e.f & xe) === 0; )
    e = e.next;
  return e;
}
function Zi(e, t, r, n, a) {
  var i = (n & Da) !== 0, s = t.length, l = e.items, o = Dt(e.effect.first), f, u = null, v, _ = [], d = [], g, y, m, b;
  if (i)
    for (b = 0; b < s; b += 1)
      g = t[b], y = a(g, b), m = /** @type {EachItem} */
      l.get(y).e, (m.f & Re) === 0 && (m.nodes?.a?.measure(), (v ??= /* @__PURE__ */ new Set()).add(m));
  for (b = 0; b < s; b += 1) {
    if (g = t[b], y = a(g, b), m = /** @type {EachItem} */
    l.get(y).e, e.outrogroups !== null)
      for (const L of e.outrogroups)
        L.pending.delete(m), L.done.delete(m);
    if ((m.f & ae) !== 0 && (fr(m), i && (m.nodes?.a?.unfix(), (v ??= /* @__PURE__ */ new Set()).delete(m))), (m.f & Re) !== 0)
      if (m.f ^= Re, m === o)
        jt(m, null, r);
      else {
        var x = u ? u.next : o;
        m === e.effect.last && (e.effect.last = m.prev), m.prev && (m.prev.next = m.next), m.next && (m.next.prev = m.prev), Be(e, u, m), Be(e, m, x), jt(m, x, r), u = m, _ = [], d = [], o = Dt(u.next);
        continue;
      }
    if (m !== o) {
      if (f !== void 0 && f.has(m)) {
        if (_.length < d.length) {
          var D = d[0], T;
          u = D.prev;
          var P = _[0], te = _[_.length - 1];
          for (T = 0; T < _.length; T += 1)
            jt(_[T], D, r);
          for (T = 0; T < d.length; T += 1)
            f.delete(d[T]);
          Be(e, P.prev, te.next), Be(e, u, P), Be(e, te, D), o = D, u = te, b -= 1, _ = [], d = [];
        } else
          f.delete(m), jt(m, o, r), Be(e, m.prev, m.next), Be(e, m, u === null ? e.effect.first : u.next), Be(e, u, m), u = m;
        continue;
      }
      for (_ = [], d = []; o !== null && o !== m; )
        (f ??= /* @__PURE__ */ new Set()).add(o), d.push(o), o = Dt(o.next);
      if (o === null)
        continue;
    }
    (m.f & Re) === 0 && _.push(m), u = m, o = Dt(m.next);
  }
  if (e.outrogroups !== null) {
    for (const L of e.outrogroups)
      L.pending.size === 0 && (Nr(e, dr(L.done)), e.outrogroups?.delete(L));
    e.outrogroups.size === 0 && (e.outrogroups = null);
  }
  if (o !== null || f !== void 0) {
    var B = [];
    if (f !== void 0)
      for (m of f)
        (m.f & ae) === 0 && B.push(m);
    for (; o !== null; )
      (o.f & ae) === 0 && o !== e.fallback && B.push(o), o = Dt(o.next);
    var ie = B.length;
    if (ie > 0) {
      var se = (n & Sn) !== 0 && s === 0 ? r : null;
      if (i) {
        for (b = 0; b < ie; b += 1)
          B[b].nodes?.a?.measure();
        for (b = 0; b < ie; b += 1)
          B[b].nodes?.a?.fix();
      }
      Wi(e, B, se);
    }
  }
  i && Ye(() => {
    if (v !== void 0)
      for (m of v)
        m.nodes?.a?.apply();
  });
}
function Xi(e, t, r, n, a, i, s, l) {
  var o = (s & Na) !== 0 ? (s & Ia) === 0 ? /* @__PURE__ */ _i(r, !1, !1) : lt(r) : null, f = (s & Oa) !== 0 ? lt(a) : null;
  return {
    v: o,
    i: f,
    e: ke(() => (i(t, o ?? r, f ?? a, l), () => {
      e.delete(n);
    }))
  };
}
function jt(e, t, r) {
  if (e.nodes)
    for (var n = e.nodes.start, a = e.nodes.end, i = t && (t.f & Re) === 0 ? (
      /** @type {EffectNodes} */
      t.nodes.start
    ) : r; n !== null; ) {
      var s = (
        /** @type {TemplateNode} */
        /* @__PURE__ */ Xt(n)
      );
      if (i.before(n), n === a)
        return;
      n = s;
    }
}
function Be(e, t, r) {
  t === null ? e.effect.first = r : t.next = r, r === null ? e.effect.last = t : r.prev = t;
}
const dn = [...` 	
\r\f \v\uFEFF`];
function Ji(e, t, r) {
  var n = e == null ? "" : "" + e;
  if (t && (n = n ? n + " " + t : t), r) {
    for (var a of Object.keys(r))
      if (r[a])
        n = n ? n + " " + a : a;
      else if (n.length)
        for (var i = a.length, s = 0; (s = n.indexOf(a, s)) >= 0; ) {
          var l = s + i;
          (s === 0 || dn.includes(n[s - 1])) && (l === n.length || dn.includes(n[l])) ? n = (s === 0 ? "" : n.substring(0, s)) + n.substring(l + 1) : s = l;
        }
  }
  return n === "" ? null : n;
}
function hn(e, t = !1) {
  var r = t ? " !important;" : ";", n = "";
  for (var a of Object.keys(e)) {
    var i = e[a];
    i != null && i !== "" && (n += " " + a + ": " + i + r);
  }
  return n;
}
function Qi(e, t) {
  if (t) {
    var r = "", n, a;
    return Array.isArray(t) ? (n = t[0], a = t[1]) : n = t, n && (r += hn(n)), a && (r += hn(a, !0)), r = r.trim(), r === "" ? null : r;
  }
  return String(e);
}
function it(e, t, r, n, a, i) {
  var s = (
    /** @type {any} */
    e[Cr]
  );
  if (s !== r || s === void 0) {
    var l = Ji(r, n, i);
    l == null ? e.removeAttribute("class") : t ? e.className = l : e.setAttribute("class", l), e[Cr] = r;
  } else if (i && a !== i)
    for (var o in i) {
      var f = !!i[o];
      (a == null || f !== !!a[o]) && e.classList.toggle(o, f);
    }
  return i;
}
function wr(e, t = {}, r, n) {
  for (var a in r) {
    var i = r[a];
    t[a] !== i && (r[a] == null ? e.style.removeProperty(a) : e.style.setProperty(a, i, n));
  }
}
function Or(e, t, r, n) {
  var a = (
    /** @type {any} */
    e[xr]
  );
  if (a !== t) {
    var i = Qi(t, n);
    i == null ? e.removeAttribute("style") : e.style.cssText = i, e[xr] = t;
  } else n && (Array.isArray(n) ? (wr(e, r?.[0], n[0]), wr(e, r?.[1], n[1], "important")) : wr(e, r, n));
  return n;
}
function $i(e, t) {
  t ? e.hasAttribute("selected") || e.setAttribute("selected", "") : e.removeAttribute("selected");
}
function es(e, t) {
  var r = e.__defaultValue, n = e.multiple, a = n ? r ?? [] : null;
  if (!(n && !vr(a))) {
    e.selectedIndex;
    for (var i of e.options) {
      var s = kt(i);
      $i(
        i,
        n ? (
          /** @type {any[]} */
          a.includes(s)
        ) : Gn(s, r)
      );
    }
  }
}
function ha(e, t, r = !1) {
  if (e.multiple) {
    if (t == null)
      return;
    if (!vr(t))
      return Ua();
    for (var n of e.options)
      n.selected = t.includes(kt(n));
    return;
  }
  for (n of e.options) {
    var a = kt(n);
    if (Gn(a, t)) {
      n.selected = !0;
      return;
    }
  }
  (!r || t !== void 0) && (e.selectedIndex = -1);
}
function _n(e) {
  var t = new MutationObserver((r) => {
    r.every(ts) || ("__defaultValue" in e && es(e), "__value" in e && ha(e, e.__value));
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
  }), Jn(() => {
    t.disconnect();
  });
}
function pn(e, t, r = t) {
  var n = /* @__PURE__ */ new WeakSet(), a = !0;
  In(e, "change", (i) => {
    var s = i ? "[selected]" : ":checked", l;
    if (e.multiple)
      l = [].map.call(e.querySelectorAll(s), kt);
    else {
      var o = e.querySelector(s) ?? // will fall back to first non-disabled option if no option is selected
      e.querySelector("option:not([disabled])");
      l = o && kt(o);
    }
    r(l), e.__value = l, E !== null && n.add(E);
  }), Ci(() => {
    var i = t();
    if (e === document.activeElement) {
      var s = (
        /** @type {Batch} */
        E
      );
      if (n.has(s))
        return;
    }
    if (ha(e, i, a), a && i === void 0) {
      var l = e.querySelector(":checked");
      l !== null && (i = kt(l), r(i));
    }
    e.__value = i, a = !1;
  });
}
function kt(e) {
  return "__value" in e ? e.__value : e.value;
}
function ts(e) {
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
const rs = /* @__PURE__ */ Symbol("is custom element"), ns = /* @__PURE__ */ Symbol("is html");
function X(e, t, r, n) {
  var a = as(e), i = a[t];
  i !== (a[t] = r) && (t === "loading" && (e[Ra] = r), r == null ? e.removeAttribute(t) : typeof r != "string" && is(e).has(t) ? e[t] = r : e.setAttribute(t, r));
}
function as(e) {
  return (
    /** @type {Record<string | symbol, unknown>} **/
    /** @type {any} */
    e[xn] ??= {
      [rs]: e.nodeName.includes("-"),
      [ns]: e.namespaceURI === Ha
    }
  );
}
var gn = /* @__PURE__ */ new Map();
function is(e) {
  var t = e.getAttribute("is") || e.nodeName, r = gn.get(t);
  if (r) return r;
  gn.set(t, r = /* @__PURE__ */ new Set());
  for (var n, a = e, i = Element.prototype; i !== a; ) {
    n = Ea(a);
    for (var s in n)
      n[s].set && // better safe than sorry, we don't want spread attributes to mess with HTML content
      s !== "innerHTML" && s !== "textContent" && s !== "innerText" && r.add(s);
    a = bn(a);
  }
  return r;
}
function yr(e, t, r = t) {
  var n = /* @__PURE__ */ new WeakSet();
  In(e, "input", async (a) => {
    var i = a ? e.defaultValue : e.value;
    if (i = br(e) ? Mr(i) : i, r(i), E !== null && n.add(E), await zi(), i !== (i = t())) {
      var s = e.selectionStart, l = e.selectionEnd, o = e.value.length;
      if (e.value = i ?? "", l !== null) {
        var f = e.value.length;
        s === l && l === o && f > o ? (e.selectionStart = f, e.selectionEnd = f) : (e.selectionStart = s, e.selectionEnd = Math.min(l, f));
      }
    }
  }), // If we are hydrating and the value has since changed,
  // then use the updated value from the input instead.
  // If defaultValue is set, then value == defaultValue
  // TODO Svelte 6: remove input.value check and set to empty string?
  Yr(t) == null && e.value && (r(br(e) ? Mr(e.value) : e.value), E !== null && n.add(E)), $n(() => {
    var a = t();
    if (e === document.activeElement) {
      var i = (
        /** @type {Batch} */
        E
      );
      if (n.has(i))
        return;
    }
    br(e) && a === Mr(e.value) || e.type === "date" && !a && !e.value || a !== e.value && (e.value = a ?? "");
  });
}
function br(e) {
  var t = e.type;
  return t === "number" || t === "range";
}
function Mr(e) {
  return e === "" ? null : +e;
}
let rr = !1;
function ss(e) {
  var t = rr;
  try {
    return rr = !1, [e(), rr];
  } finally {
    rr = t;
  }
}
function st(e, t, r, n) {
  var a = !0, i = (r & Fa) !== 0, s = (r & Pa) !== 0, l = (
    /** @type {V} */
    n
  ), o = !0, f = (
    /** @type {Derived<V> | undefined} */
    void 0
  ), u = () => s && a ? (f ??= /* @__PURE__ */ Ut(
    /** @type {() => V} */
    n
  ), h(f)) : (o && (o = !1, l = s ? Yr(
    /** @type {() => V} */
    n
  ) : (
    /** @type {V} */
    n
  )), l);
  let v;
  if (i) {
    var _ = gt in e || za in e;
    v = _t(e, t)?.set ?? (_ && t in e ? (T) => e[t] = T : void 0);
  }
  var d, g = !1;
  i ? [d, g] = ss(() => (
    /** @type {V} */
    e[t]
  )) : d = /** @type {V} */
  e[t], d === void 0 && n !== void 0 && (d = u(), v && ($a(), v(d)));
  var y;
  if (y = () => {
    var T = (
      /** @type {V} */
      e[t]
    );
    return T === void 0 ? u() : (o = !0, T);
  }, (r & ja) === 0)
    return y;
  if (v) {
    var m = e.$$legacy;
    return (
      /** @type {() => V} */
      (function(T, P) {
        return arguments.length > 0 ? ((!P || m || g) && v(P ? y() : T), T) : y();
      })
    );
  }
  var b = !1, x = ((r & La) !== 0 ? Ut : jn)(() => (b = !1, y()));
  i && h(x);
  var D = (
    /** @type {Effect} */
    z
  );
  return (
    /** @type {() => V} */
    (function(T, P) {
      if (arguments.length > 0) {
        const te = P ? h(x) : i ? tt(T) : T;
        return N(x, te), b = !0, l !== void 0 && (l = te), T;
      }
      return Pe && b || (D.f & ee) !== 0 ? x.v : h(x);
    })
  );
}
const ls = "5";
typeof window < "u" && ((window.__svelte ??= {}).v ??= /* @__PURE__ */ new Set()).add(ls);
var os = /* @__PURE__ */ M('<path d="M6 3.2 10.8 8 6 12.8" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>'), us = /* @__PURE__ */ M('<path d="M3.2 6 8 10.8 12.8 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"></path>'), fs = /* @__PURE__ */ M('<path d="M10 3.2 5.2 8 10 12.8" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"></path>'), cs = /* @__PURE__ */ M('<path d="M1.5 4.2c0-.9.7-1.6 1.6-1.6h3.1l1.5 1.5h5.2c.9 0 1.6.7 1.6 1.6v6.4c0 .9-.7 1.6-1.6 1.6H3.1c-.9 0-1.6-.7-1.6-1.6z" fill="currentColor"></path><path d="M1.5 6.3h13" stroke="rgb(0 0 0 / 0.18)" stroke-width="0.8"></path>', 1), vs = /* @__PURE__ */ M('<path d="M8 1.6l1.9 4 4.3.5-3.2 3 .9 4.3L8 11.2l-3.9 2.2.9-4.3-3.2-3 4.3-.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"></path>'), ds = /* @__PURE__ */ M('<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>'), hs = /* @__PURE__ */ M('<path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke="#000" stroke-width="1.7" stroke-linecap="round"></path>'), _s = /* @__PURE__ */ M('<path d="M4.9 8.3l2.1 2.1 4.1-4.6" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path>'), ps = /* @__PURE__ */ M('<path d="M6.4 5.2v5.6M9.6 5.2v5.6" stroke="#000" stroke-width="1.8" stroke-linecap="round"></path>'), gs = /* @__PURE__ */ M('<path d="M4.8 8h6.4" stroke="#000" stroke-width="1.8" stroke-linecap="round"></path>'), ms = /* @__PURE__ */ M('<path d="M8 4.6v6.2M5.4 8.4 8 11l2.6-2.6" fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>'), ks = /* @__PURE__ */ M('<circle cx="8" cy="6.2" r="2.4" fill="#000"></circle><path d="M3.4 12.6c1-1.9 2.7-2.8 4.6-2.8s3.6.9 4.6 2.8" fill="#000"></path>', 1), ws = /* @__PURE__ */ M('<mask><rect width="16" height="16" fill="#fff"></rect><!></mask><circle cx="8" cy="8" r="7" fill="currentColor"></circle>', 1), ys = /* @__PURE__ */ M('<circle cx="3.5" cy="8" r="1.45" fill="currentColor"></circle><circle cx="8" cy="8" r="1.45" fill="currentColor"></circle><circle cx="12.5" cy="8" r="1.45" fill="currentColor"></circle>', 1), bs = /* @__PURE__ */ M('<path d="M2.2 2.2l11.6 11.6" stroke="var(--icon-cut, rgb(20 20 30))" stroke-width="2.6" stroke-linecap="round"></path><path d="M2.2 2.2l11.6 11.6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>', 1), Ms = /* @__PURE__ */ M('<path d="M8 1.8c-2.4 0-4 1.8-4 4.2v2.7L2.6 10.9c-.3.4 0 .9.5.9h9.8c.5 0 .8-.5.5-.9L12 8.7V6c0-2.4-1.6-4.2-4-4.2z" fill="currentColor"></path><path d="M6.3 12.8a1.8 1.8 0 0 0 3.4 0z" fill="currentColor"></path><!>', 1), Es = /* @__PURE__ */ M('<path d="M12.6 6.2A4.9 4.9 0 0 0 3.6 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><path d="M13.6 3.2v3.6H10z" fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round"></path><path d="M3.4 9.8a4.9 4.9 0 0 0 9 1.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><path d="M2.4 12.8V9.2H6z" fill="currentColor" stroke="currentColor" stroke-width="0.6" stroke-linejoin="round"></path>', 1), Cs = /* @__PURE__ */ M('<path d="M2.5 8h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 1.5v4M6 3.8 8 5.8l2-2M8 14.5v-4M6 12.2l2-2 2 2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>', 1), xs = /* @__PURE__ */ M('<path d="M2.5 1.8h11M2.5 14.2h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 4.2v7.6M6 6.2l2-2 2 2M6 9.8l2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>', 1), Ss = /* @__PURE__ */ M('<path d="M2.5 2.5l11 11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>'), As = /* @__PURE__ */ M('<g><path d="M5.2 1.6h5.6l-.7 1.3v3.2l2 2.4v1H3.9v-1l2-2.4V2.9z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"></path><path d="M8 9.5v5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path></g><!>', 1), Ts = /* @__PURE__ */ M('<circle cx="6.5" cy="5" r="2.6" fill="currentColor"></circle><path d="M1.5 13.5c.6-2.7 2.6-4.2 5-4.2s4.4 1.5 5 4.2z" fill="currentColor"></path><path d="M12.8 2.5v5M10.3 5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path>', 1), qs = /* @__PURE__ */ M('<path d="M13 6A5.2 5.2 0 0 0 3.4 4.4M3 10a5.2 5.2 0 0 0 9.6 1.6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"></path><path d="M14 2.6v3.8h-3.8zM2 13.4V9.6h3.8z" fill="currentColor"></path>', 1), zs = /* @__PURE__ */ M('<path d="M2.5 5h10M10 2.5 12.5 5 10 7.5M13.5 11h-10M6 8.5 3.5 11 6 13.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>'), Rs = /* @__PURE__ */ M('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M4.2 5.8 6.4 8 4.2 10.2M7.8 10.6h4" fill="none" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></mask><rect x="1.2" y="2.2" width="13.6" height="11.6" rx="2.4" fill="currentColor"></rect>', 1), Ns = /* @__PURE__ */ M('<rect x="1.6" y="2.6" width="12.8" height="10.8" rx="2.2" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M4.4 6 6.4 8 4.4 10M7.8 10.2h3.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"></path>', 1), Os = /* @__PURE__ */ M('<path d="M7.2 2.2a5.6 5.6 0 1 0 6.6 7.6A5 5 0 0 1 7.2 2.2z" fill="currentColor"></path><path d="M12 1.8l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5zM14.3 5.6l.3.7.7.3-.7.3-.3.7-.3-.7-.7-.3.7-.3z" fill="currentColor"></path>', 1), Ds = /* @__PURE__ */ M('<path d="M6.6 3a5.6 5.6 0 1 0 6.6 7.6A5 5 0 0 1 6.6 3z" fill="currentColor"></path><path d="M10 1.6h3.2L10 5h3.2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"></path>', 1), Is = /* @__PURE__ */ M('<circle cx="5.6" cy="5.2" r="2.5" fill="currentColor"></circle><path d="M1 13.4c.4-2.6 2.2-4 4.6-4s4.2 1.4 4.6 4z" fill="currentColor"></path><circle cx="11.3" cy="5.6" r="2.1" fill="currentColor"></circle><path d="M10.9 9.4c2.2 0 3.7 1.3 4.1 3.6h-3.6c-.2-1.4-.6-2.6-1.4-3.5z" fill="currentColor"></path>', 1), Ls = /* @__PURE__ */ M('<path d="M10.6 1.6a3.3 3.3 0 0 0-3.2 4.2L2.2 11a1.4 1.4 0 0 0 2 2l5.2-5.2a3.3 3.3 0 0 0 4.2-4.2l-1.9 1.9-1.6-.4-.4-1.6z" fill="currentColor"></path><path d="M2.6 2.6l1.6-.8 2.6 2.6-.8.8 4.6 4.6M11.4 11.4l1.5 1.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"></path>', 1), js = /* @__PURE__ */ M('<path d="M7.8 1.8c-3 0-5.2 2.1-5.2 4.9 0 1.4.5 2.4 1.3 3.3v3.6c0 .4.3.6.6.6h4.2c.3 0 .6-.3.6-.6v-1.4h1.6c.7 0 1.2-.5 1.2-1.2V9.3l1.1-.4c.3-.1.4-.5.2-.8l-1.3-2C12 3.7 10.3 1.8 7.8 1.8z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"></path><path d="M5.4 6.6c0-1.1.9-1.8 1.8-1.8.4-.5 1-.7 1.6-.5M6.6 8.6c.5.4 1.3.4 1.8 0" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>', 1), Fs = /* @__PURE__ */ M('<path d="M5.3 8.2V3.4a.95.95 0 0 1 1.9 0v3.8V2.5a.95.95 0 0 1 1.9 0v4.7V3.2a.95.95 0 0 1 1.9 0v4.6-2.4a.9.9 0 0 1 1.8 0v4.4c0 2.8-1.9 4.7-4.5 4.7-1.7 0-2.8-.7-3.8-2L2.6 9.5a1 1 0 0 1 1.5-1.3z" fill="currentColor"></path>'), Ps = /* @__PURE__ */ M('<path d="M2.6 4h10.8M6 4V2.6h4V4M4 4l.7 9.4h6.6L12 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>'), Vs = /* @__PURE__ */ M('<path d="M2.2 11.4a6 6 0 1 1 11.6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path><path d="M8 10.2 5.4 6.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path><circle cx="8" cy="10.4" r="1.3" fill="currentColor"></circle>', 1), Hs = /* @__PURE__ */ M('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M8 6v3.4" stroke="#000" stroke-width="1.7" stroke-linecap="round"></path><circle cx="8" cy="11.6" r="1" fill="#000"></circle></mask><path d="M6.9 2.3a1.3 1.3 0 0 1 2.2 0l5.5 9.7c.5.9-.1 1.9-1.1 1.9H2.5c-1 0-1.6-1-1.1-1.9z" fill="currentColor"></path>', 1), Bs = /* @__PURE__ */ M('<path d="M2.2 4.4 6.6 1.6l3.6 2.4-1.4 1.8-1.6-.6-.8 1 6.3 6.4a1.2 1.2 0 0 1-1.7 1.7L4.6 8l-1 .9z" fill="currentColor"></path>'), Us = /* @__PURE__ */ M('<circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M8 1.8a6.2 6.2 0 0 0 0 12.4z" fill="currentColor"></path>', 1), Ys = /* @__PURE__ */ M('<rect x="1.2" y="2.4" width="13.6" height="11.2" rx="2.4" fill="none" stroke="currentColor" stroke-width="1.4"></rect><rect x="8.4" y="4.6" width="4.2" height="6.8" rx="1" fill="currentColor"></rect>', 1), Gs = /* @__PURE__ */ M('<path d="M14 2 9.4 6.6M9.2 3v3.8H13M2 14l4.6-4.6M3 9.2h3.8V13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>'), Ks = /* @__PURE__ */ M('<path d="M9.4 6.6 14 2M10.2 2H14v3.8M6.6 9.4 2 14M2 10.2V14h3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path>'), Ws = /* @__PURE__ */ M('<path d="M3 8h10" stroke="currentColor" stroke-width="1"></path>'), Zs = /* @__PURE__ */ M('<path d="M3.5 3.5l9 9M12.5 3.5l-9 9" stroke="currentColor" stroke-width="1"></path>'), Xs = /* @__PURE__ */ M('<rect x="3.6" y="1.6" width="10.8" height="8.4" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.2"></rect><rect x="1.4" y="5.4" width="10.4" height="8.8" rx="1.8" fill="currentColor"></rect><path d="M3.6 8.6 5.2 10l-1.6 1.4M6.4 11.8h2.8" fill="none" stroke="rgb(20 20 30)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"></path>', 1), Js = /* @__PURE__ */ M('<mask><rect width="16" height="16" fill="#fff"></rect><path d="M5.2 8.2l1.9 1.9 3.8-4.2" fill="none" stroke="#000" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></mask><path d="M8 .9l1.6 1.2 2-.1.6 1.9 1.7 1.1-.6 1.9.6 1.9-1.7 1.1-.6 1.9-2-.1L8 15.1l-1.6-1.2-2 .1-.6-1.9-1.7-1.1.6-1.9-.6-1.9 1.7-1.1.6-1.9 2 .1z" fill="currentColor" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round"></path>', 1), Qs = /* @__PURE__ */ M('<rect x="1.6" y="1.6" width="12.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M6 10 10.4 5.6M7 5.4h3.6V9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>', 1), $s = /* @__PURE__ */ M('<rect x="1.6" y="1.6" width="12.8" height="12.8" rx="3" fill="none" stroke="currentColor" stroke-width="1.3"></rect><path d="M8 5v6M5 8h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>', 1), el = /* @__PURE__ */ M('<circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5"></circle><path d="M3.8 3.8l8.4 8.4" stroke="currentColor" stroke-width="1.5"></path>', 1), tl = /* @__PURE__ */ M('<svg viewBox="0 0 16 16" aria-hidden="true"><!></svg>');
function Ht(e, t) {
  const r = ji();
  let n = st(t, "size", 3, 12), a = st(t, "class", 3, "");
  const i = `url(#${r})`;
  var s = tl(), l = C(s);
  {
    var o = (c) => {
      var p = os();
      k(c, p);
    }, f = (c) => {
      var p = us();
      k(c, p);
    }, u = (c) => {
      var p = fs();
      k(c, p);
    }, v = (c) => {
      var p = cs();
      k(c, p);
    }, _ = (c) => {
      var p = vs();
      G(() => X(p, "fill", t.name === "star-fill" ? "currentColor" : "none")), k(c, p);
    }, d = (c) => {
      var p = ds();
      k(c, p);
    }, g = (c) => {
      var p = ws(), I = Ue(p), $ = w(C(I));
      {
        var pe = (j) => {
          var le = hs();
          k(j, le);
        }, Qe = (j) => {
          var le = _s();
          k(j, le);
        }, He = (j) => {
          var le = ps();
          k(j, le);
        }, ct = (j) => {
          var le = gs();
          k(j, le);
        }, zt = (j) => {
          var le = ms();
          k(j, le);
        }, Rt = (j) => {
          var le = ks();
          k(j, le);
        };
        he($, (j) => {
          t.name === "xmark-circle" ? j(pe) : t.name === "check-circle" ? j(Qe, 1) : t.name === "pause-circle" ? j(He, 2) : t.name === "minus-circle" ? j(ct, 3) : t.name === "arrow-down-circle" ? j(zt, 4) : j(Rt, -1);
        });
      }
      var Nt = w(I);
      G(() => {
        X(I, "id", r), X(Nt, "mask", i);
      }), k(c, p);
    }, y = (c) => {
      var p = ys();
      k(c, p);
    }, m = (c) => {
      var p = Ms(), I = w(Ue(p), 2);
      {
        var $ = (pe) => {
          var Qe = bs();
          k(pe, Qe);
        };
        he(I, (pe) => {
          t.name === "bell-slash" && pe($);
        });
      }
      k(c, p);
    }, b = (c) => {
      var p = Es();
      k(c, p);
    }, x = (c) => {
      var p = Cs();
      k(c, p);
    }, D = (c) => {
      var p = xs();
      k(c, p);
    }, T = (c) => {
      var p = As(), I = Ue(p), $ = C(I), pe = w(I);
      {
        var Qe = (He) => {
          var ct = Ss();
          k(He, ct);
        };
        he(pe, (He) => {
          t.name === "pin-slash" && He(Qe);
        });
      }
      G(() => {
        X(I, "transform", t.name === "pin-slash" ? "rotate(45 8 8)" : ""), X($, "fill", t.name === "pin" ? "currentColor" : "none");
      }), k(c, p);
    }, P = (c) => {
      var p = Ts();
      k(c, p);
    }, te = (c) => {
      var p = qs();
      k(c, p);
    }, B = (c) => {
      var p = zs();
      k(c, p);
    }, ie = (c) => {
      var p = Rs(), I = Ue(p), $ = w(I);
      G(() => {
        X(I, "id", r), X($, "mask", i);
      }), k(c, p);
    }, se = (c) => {
      var p = Ns();
      k(c, p);
    }, L = (c) => {
      var p = Os();
      k(c, p);
    }, Ze = (c) => {
      var p = Ds();
      k(c, p);
    }, Xe = (c) => {
      var p = Is();
      k(c, p);
    }, At = (c) => {
      var p = Ls();
      k(c, p);
    }, Tt = (c) => {
      var p = js();
      k(c, p);
    }, ot = (c) => {
      var p = Fs();
      k(c, p);
    }, Ie = (c) => {
      var p = Ps();
      k(c, p);
    }, ut = (c) => {
      var p = Vs();
      k(c, p);
    }, qt = (c) => {
      var p = Hs(), I = Ue(p), $ = w(I);
      G(() => {
        X(I, "id", r), X($, "mask", i);
      }), k(c, p);
    }, A = (c) => {
      var p = Bs();
      k(c, p);
    }, U = (c) => {
      var p = Us();
      k(c, p);
    }, ce = (c) => {
      var p = Ys();
      k(c, p);
    }, ye = (c) => {
      var p = Gs();
      k(c, p);
    }, ve = (c) => {
      var p = Ks();
      k(c, p);
    }, V = (c) => {
      var p = Ws();
      k(c, p);
    }, K = (c) => {
      var p = Zs();
      k(c, p);
    }, re = (c) => {
      var p = Xs();
      k(c, p);
    }, Le = (c) => {
      var p = Js(), I = Ue(p), $ = w(I);
      G(() => {
        X(I, "id", r), X($, "mask", i);
      }), k(c, p);
    }, Se = (c) => {
      var p = Qs();
      k(c, p);
    }, Je = (c) => {
      var p = $s();
      k(c, p);
    }, ft = (c) => {
      var p = el();
      k(c, p);
    };
    he(l, (c) => {
      t.name === "chevron-right" ? c(o) : t.name === "chevron-down" ? c(f, 1) : t.name === "chevron-left" ? c(u, 2) : t.name === "folder" ? c(v, 3) : t.name === "star" || t.name === "star-fill" ? c(_, 4) : t.name === "xmark" ? c(d, 5) : t.name === "xmark-circle" || t.name === "check-circle" || t.name === "pause-circle" || t.name === "minus-circle" || t.name === "arrow-down-circle" || t.name === "person" ? c(g, 6) : t.name === "ellipsis" ? c(y, 7) : t.name === "bell" || t.name === "bell-slash" ? c(m, 8) : t.name === "refresh" ? c(b, 9) : t.name === "compress" ? c(x, 10) : t.name === "expand" ? c(D, 11) : t.name === "pin" || t.name === "pin-slash" ? c(T, 12) : t.name === "person-plus" ? c(P, 13) : t.name === "person-switch" ? c(te, 14) : t.name === "swap" ? c(B, 15) : t.name === "terminal" ? c(ie, 16) : t.name === "terminal-outline" ? c(se, 17) : t.name === "moon-stars" ? c(L, 18) : t.name === "moon-zzz" ? c(Ze, 19) : t.name === "people" ? c(Xe, 20) : t.name === "wrench" ? c(At, 21) : t.name === "brain" ? c(Tt, 22) : t.name === "hand" ? c(ot, 23) : t.name === "trash" ? c(Ie, 24) : t.name === "gauge" ? c(ut, 25) : t.name === "warn" ? c(qt, 26) : t.name === "hammer" ? c(A, 27) : t.name === "half-circle" ? c(U, 28) : t.name === "snap-right" ? c(ce, 29) : t.name === "shrink" ? c(ye, 30) : t.name === "grow" ? c(ve, 31) : t.name === "win-min" ? c(V, 32) : t.name === "win-close" ? c(K, 33) : t.name === "shells" ? c(re, 34) : t.name === "seal-check" ? c(Le, 35) : t.name === "app-forward" ? c(Se, 36) : t.name === "app-plus" ? c(Je, 37) : t.name === "nosign" && c(ft, 38);
    });
  }
  G(() => {
    it(s, 0, `icon ${a() ?? ""}`, "svelte-1rfkemj"), X(s, "width", n()), X(s, "height", n());
  }), k(e, s);
}
function mn(e) {
  const t = Date.parse(e);
  return Number.isFinite(t) ? new Date(t + 9 * 36e5).toISOString().slice(0, 10) : "";
}
function Dr(e) {
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
const ht = { waiting: 0, working: 1, paused: 2, idle: 3 }, _a = (e) => ({ 접수: "waiting", "진행 중": "working", 대기: "paused", 완료: "idle" })[e] || "waiting";
function Ir(e) {
  let t = "idle", r = 99;
  for (const n of e.sessions)
    ht[n.state] < r && (r = ht[n.state], t = n.state);
  return t;
}
const rl = (e) => e.sessions.filter((t) => t.state === "waiting" || t.state === "working");
function nl(e, t) {
  const r = Math.max(0, Math.floor((t - e) / 1e3));
  return r < 60 ? `${r}초` : r < 3600 ? `${Math.floor(r / 60)}분 ${r % 60}초` : r >= 86400 ? `${Math.floor(r / 86400)}일 ${Math.floor(r % 86400 / 3600)}시간` : `${Math.floor(r / 3600)}시간 ${Math.floor(r % 3600 / 60)}분`;
}
function al(e, { query: t = "", status: r = "", groupBy: n = "category", dateField: a = "requested_at", from: i = "", to: s = "" } = {}) {
  const l = (u) => a === "activity" ? u.status === "완료" ? "completed_at" : "requested_at" : a, o = e.filter((u) => {
    const v = mn(u[l(u)]);
    return (!r || u.status === r) && (!i || v && v >= i) && (!s || v && v <= s) && [u.title, u.requester, u.department, u.description, u.assignee].some((_) => String(_ || "").toLowerCase().includes(t.toLowerCase()));
  }), f = /* @__PURE__ */ new Map();
  for (const u of o) {
    const v = mn(u[l(u)]), _ = n === "date" ? v ? v + " (" + new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "short" }).format(/* @__PURE__ */ new Date(v + "T00:00:00+09:00")) + ")" : l(u) === "completed_at" ? u.status === "완료" ? "완료일 미상" : "미완료" : "날짜 미상" : u[n] || "미분류";
    f.has(_) || f.set(_, { id: n + ":" + _, name: _, date: v, sessions: [] }), f.get(_).sessions.push({ ...u, state: _a(u.status) });
  }
  for (const u of f.values()) u.sessions.sort((v, _) => ht[v.state] - ht[_.state] || (v.due_date || "9999").localeCompare(_.due_date || "9999") || _.created_at.localeCompare(v.created_at));
  return [...f.values()].sort((u, v) => n === "date" ? v.date.localeCompare(u.date) : ht[Ir(u)] - ht[Ir(v)] || u.name.localeCompare(v.name, "ko"));
}
var il = /* @__PURE__ */ Q('<span class="track svelte-aqlqqq"></span> <span class="spin svelte-aqlqqq"><span class="head svelte-aqlqqq"></span></span>', 1), sl = /* @__PURE__ */ Q('<span class="ripple svelte-aqlqqq"></span> <span class="dot svelte-aqlqqq"></span>', 1), kn = /* @__PURE__ */ Q('<span class="pop svelte-aqlqqq"><!></span>'), ll = /* @__PURE__ */ Q('<span class="pop ended svelte-aqlqqq"><!></span>'), ol = /* @__PURE__ */ Q('<span class="inner svelte-aqlqqq"><!></span>'), ul = /* @__PURE__ */ Q('<span class="box svelte-aqlqqq"><!></span>');
function cr(e, t) {
  Kt(t, !0);
  let r = st(t, "scale", 3, 1);
  var n = ul();
  let a;
  var i = C(n);
  Ki(i, () => t.state, (s) => {
    var l = ol(), o = C(l);
    {
      var f = (g) => {
        var y = il();
        k(g, y);
      }, u = (g) => {
        var y = sl();
        k(g, y);
      }, v = (g) => {
        var y = kn(), m = C(y);
        Ht(m, { name: "check-circle", size: 16 }), k(g, y);
      }, _ = (g) => {
        var y = kn(), m = C(y);
        Ht(m, { name: "pause-circle", size: 16 }), k(g, y);
      }, d = (g) => {
        var y = ll(), m = C(y);
        Ht(m, { name: "minus-circle", size: 15 }), k(g, y);
      };
      he(o, (g) => {
        t.state === "working" ? g(f) : t.state === "waiting" ? g(u, 1) : t.state === "idle" ? g(v, 2) : t.state === "paused" ? g(_, 3) : g(d, -1);
      });
    }
    k(s, l);
  }), G((s) => a = Or(n, "", a, { "--c": s, "--s": r() }), [() => Dr(t.state)]), k(e, n), Wt();
}
var fl = /* @__PURE__ */ Q('<button class="request-row svelte-v68t2j"><!> <span class="request-main svelte-v68t2j"><strong class="svelte-v68t2j"> </strong><span class="svelte-v68t2j"> </span></span> <span class="request-end svelte-v68t2j"><span class="request-status svelte-v68t2j"> </span><small> </small><small class="svelte-v68t2j"> </small></span></button>');
function wn(e, t) {
  Kt(t, !0);
  const r = /* @__PURE__ */ me(() => t.task.status !== "완료" && t.task.due_date && t.task.due_date < t.today);
  var n = fl(), a = C(n);
  cr(a, {
    get state() {
      return t.task.state;
    }
  });
  var i = w(a, 2), s = C(i), l = F(s), o = w(s), f = F(o), u = w(i, 2), v = C(u), _ = F(v), d = w(v);
  let g;
  var y = F(d, !0), m = w(d), b = F(m, !0);
  G(
    (x) => {
      R(l, `${t.task.is_test ? "[테스트] " : ""}${t.task.title ?? ""}`), R(f, `${t.task.requester ?? ""}${t.task.department ? " · " + t.task.department : ""} · ${t.task.channel ?? ""} · 담당 ${(t.task.assignee || "미배정") ?? ""}`), R(_, `${t.task.status ?? ""}${t.task.priority ? " · " + t.task.priority : ""}`), g = it(d, 1, "svelte-v68t2j", null, g, { overdue: h(r) }), R(y, t.task.due_date ? `기한 ${t.task.due_date}` : "기한 미지정"), R(b, x);
    },
    [
      () => t.task.status === "완료" ? "처리 완료" : "접수 후 " + nl(Date.parse(t.task.created_at), t.now)
    ]
  ), Te("click", n, () => t.onopen(t.task.id)), k(e, n), Wt();
}
Gr(["click"]);
var cl = /* @__PURE__ */ Q('<span class="count svelte-sz6uh1"><span class="dot svelte-sz6uh1"></span> </span>'), vl = /* @__PURE__ */ Q('<button class="completed-toggle svelte-sz6uh1"><span class="svelte-sz6uh1"> </span><span class="svelte-sz6uh1">이력 보기</span></button><!>', 1), dl = /* @__PURE__ */ Q('<div class="body svelte-sz6uh1"><!> <!></div>'), hl = /* @__PURE__ */ Q('<button class="svelte-sz6uh1"><!><span class="svelte-sz6uh1"> </span></button>'), _l = /* @__PURE__ */ Q('<small class="svelte-sz6uh1"> </small>'), pl = /* @__PURE__ */ Q('<div class="compact-list svelte-sz6uh1"><!><!></div>'), gl = /* @__PURE__ */ Q('<div><button class="head svelte-sz6uh1"><span><!></span> <span class="folder svelte-sz6uh1"><!></span> <span class="names svelte-sz6uh1"><span class="name svelte-sz6uh1"> </span><span class="path svelte-sz6uh1"><!></span></span> <span class="counts svelte-sz6uh1"></span></button> <!></div>');
function ml(e, t) {
  Kt(t, !0);
  let r = st(t, "compact", 3, !1), n = /* @__PURE__ */ Y(!1), a = /* @__PURE__ */ Y(!1);
  const i = /* @__PURE__ */ me(() => Ir(t.g)), s = /* @__PURE__ */ me(() => Dr(h(i))), l = /* @__PURE__ */ me(() => rl(t.g)), o = /* @__PURE__ */ me(() => h(l)[0]), f = /* @__PURE__ */ me(() => t.g.sessions.filter((A) => A.status !== "완료")), u = /* @__PURE__ */ me(() => t.g.sessions.filter((A) => A.status === "완료")), v = /* @__PURE__ */ me(() => ["waiting", "working", "paused", "idle"].map((A) => ({
    st: A,
    n: t.g.sessions.filter((U) => U.state === A).length
  })).filter((A) => A.n)), _ = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(/* @__PURE__ */ new Date());
  var d = gl();
  let g, y;
  var m = C(d), b = C(m);
  let x;
  var D = C(b);
  Ht(D, { name: "chevron-right", size: 11 });
  var T = w(b, 2), P = C(T);
  {
    var te = (A) => {
      cr(A, {
        get state() {
          return h(o).state;
        }
      });
    }, B = (A) => {
      Ht(A, { name: "folder", size: 14 });
    };
    he(P, (A) => {
      h(n) && h(o) ? A(te) : A(B, -1);
    });
  }
  var ie = w(T, 2), se = C(ie), L = F(se, !0), Ze = w(se), Xe = C(Ze);
  {
    var At = (A) => {
      var U = cn();
      G(() => R(U, `${h(o).status ?? ""} · ${h(o).title ?? ""}`)), k(A, U);
    }, Tt = (A) => {
      var U = cn();
      G(() => R(U, `전체 ${t.g.sessions.length ?? ""}건 · 미완료 ${h(f).length ?? ""}건`)), k(A, U);
    };
    he(Xe, (A) => {
      h(n) && h(o) ? A(At) : A(Tt, -1);
    });
  }
  var ot = w(ie, 2);
  dt(ot, 21, () => h(v), Rr, (A, U) => {
    var ce = cl(), ye = C(ce);
    let ve;
    var V = w(ye, 1, !0);
    G(
      (K) => {
        ve = Or(ye, "", ve, { background: K }), R(V, h(U).n);
      },
      [() => `rgb(${Dr(h(U).st) ?? ""})`]
    ), k(A, ce);
  });
  var Ie = w(m, 2);
  {
    var ut = (A) => {
      var U = dl(), ce = C(U);
      dt(ce, 17, () => h(f), (V) => V.id, (V, K) => {
        wn(V, {
          get task() {
            return h(K);
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
      var ye = w(ce, 2);
      {
        var ve = (V) => {
          var K = vl(), re = Ue(K), Le = C(re), Se = F(Le), Je = w(re);
          {
            var ft = (c) => {
              var p = Li(), I = Ue(p);
              dt(I, 17, () => h(u), ($) => $.id, ($, pe) => {
                wn($, {
                  get task() {
                    return h(pe);
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
              }), k(c, p);
            };
            he(Je, (c) => {
              h(a) && c(ft);
            });
          }
          G(() => {
            X(re, "aria-expanded", h(a)), R(Se, `${h(a) ? "▾" : "▸"} 완료 업무 ${h(u).length ?? ""}건`);
          }), Te("click", re, () => N(a, !h(a))), k(V, K);
        };
        he(ye, (V) => {
          h(u).length && V(ve);
        });
      }
      k(A, U);
    }, qt = (A) => {
      var U = pl(), ce = C(U);
      dt(ce, 17, () => t.g.sessions.slice(0, 3), Rr, (V, K) => {
        var re = hl(), Le = C(re);
        cr(Le, {
          get state() {
            return h(K).state;
          },
          scale: 0.7
        });
        var Se = w(Le), Je = F(Se, !0);
        G(() => R(Je, h(K).title)), Te("click", re, () => t.onopen(h(K).id)), k(V, re);
      });
      var ye = w(ce);
      {
        var ve = (V) => {
          var K = _l(), re = F(K);
          G(() => R(re, `상세 보기에서 나머지 ${t.g.sessions.length - 3}건을 확인하세요.`)), k(V, K);
        };
        he(ye, (V) => {
          t.g.sessions.length > 3 && V(ve);
        });
      }
      k(A, U);
    };
    he(Ie, (A) => {
      !h(n) && !r() ? A(ut) : r() && !h(n) && A(qt, 1);
    });
  }
  G(() => {
    g = it(d, 1, "card svelte-sz6uh1", null, g, { waiting: h(i) === "waiting" }), y = Or(d, "", y, { "--c": h(s) }), X(m, "aria-expanded", !h(n)), x = it(b, 1, "chev svelte-sz6uh1", null, x, { open: !h(n) }), R(L, t.g.name);
  }), Te("click", m, () => N(n, !h(n))), k(e, d), Wt();
}
Gr(["click"]);
var kl = /* @__PURE__ */ Q('<button><!> <b class="svelte-nytrg3"> </b></button>'), wl = /* @__PURE__ */ Q('<p role="alert">시작일은 종료일보다 늦을 수 없습니다.</p>'), yl = /* @__PURE__ */ Q('<p role="alert"> </p>'), bl = /* @__PURE__ */ Q('<div class="board-empty svelte-nytrg3"><strong class="svelte-nytrg3"> </strong><p class="svelte-nytrg3"> </p></div>'), Ml = /* @__PURE__ */ Q('<section class="claude-workboard svelte-nytrg3" aria-label="총무 업무 카드 보드"><div class="board-title svelte-nytrg3"><div><p class="svelte-nytrg3"> </p><h2 class="svelte-nytrg3"> </h2><span class="svelte-nytrg3"> </span></div><span class="board-role svelte-nytrg3"> </span></div> <div class="state-chips svelte-nytrg3" aria-label="업무 상태 필터"><button>전체 <b class="svelte-nytrg3"> </b></button><!></div> <div class="board-controls svelte-nytrg3"><input type="search" placeholder="업무·요청자·부서·내용 검색" aria-label="업무 검색" class="svelte-nytrg3"/><select aria-label="카드 분류 기준" class="svelte-nytrg3"><option>날짜별</option><option>업무 분류별</option><option>요청 부서별</option><option>접수 경로별</option></select><button class="svelte-nytrg3"> </button><button class="svelte-nytrg3">CSV 내보내기</button><button class="svelte-nytrg3"> </button></div> <!> <!> <div class="date-controls svelte-nytrg3"><label class="svelte-nytrg3">날짜 기준<select aria-label="날짜 기준" class="svelte-nytrg3"><option>처리일 (완료: 완료일 / 미완료: 요청일)</option><option>요청일</option><option>완료일</option><option>등록일</option></select></label><label class="svelte-nytrg3">시작일<input type="date" aria-label="시작일" class="svelte-nytrg3"/></label><label class="svelte-nytrg3">종료일<input type="date" aria-label="종료일" class="svelte-nytrg3"/></label><button class="svelte-nytrg3">기간 초기화</button></div> <div class="board-summary svelte-nytrg3"><span> </span><small class="svelte-nytrg3"> </small></div> <div></div> <p class="board-credit svelte-nytrg3">Claude Board의 카드·상태 컴포넌트를 총무 업무용으로 적용했습니다. <a href="/third-party-notices" target="_blank" rel="noreferrer" class="svelte-nytrg3">오픈소스 안내 ↗</a></p></section>');
function El(e, t) {
  Kt(t, !0);
  let r = st(t, "tasks", 7), n = st(t, "texts", 19, () => ({})), a = st(t, "readonly", 3, !1), i = /* @__PURE__ */ Y(""), s = /* @__PURE__ */ Y(""), l = /* @__PURE__ */ Y("date"), o = /* @__PURE__ */ Y("activity"), f = /* @__PURE__ */ Y(""), u = /* @__PURE__ */ Y(""), v = /* @__PURE__ */ Y(!1), _ = /* @__PURE__ */ Y(tt(Date.now())), d = /* @__PURE__ */ Y(!1), g = /* @__PURE__ */ Y("");
  const y = ["접수", "진행 중", "대기", "완료"], m = /* @__PURE__ */ me(() => al(r(), {
    query: h(i),
    status: h(s),
    groupBy: h(l),
    dateField: h(o),
    from: h(f),
    to: h(u)
  })), b = /* @__PURE__ */ me(() => h(f) && h(u) && h(f) > h(u)), x = /* @__PURE__ */ me(() => h(m).reduce((q, W) => q + W.sessions.length, 0));
  Mi(() => {
    const q = setInterval(() => N(_, Date.now(), !0), 6e4);
    return () => clearInterval(q);
  });
  async function D() {
    N(d, !0), N(g, "");
    try {
      r(await t.onrefresh());
    } catch (q) {
      N(g, q.message, !0);
    } finally {
      N(d, !1);
    }
  }
  var T = Ml(), P = C(T), te = C(P), B = C(te), ie = F(B, !0), se = w(B), L = F(se, !0), Ze = w(se), Xe = F(Ze, !0), At = w(te), Tt = F(At, !0), ot = w(P, 2), Ie = C(ot);
  let ut;
  var qt = w(C(Ie)), A = F(qt, !0), U = w(Ie);
  dt(U, 17, () => y, Rr, (q, W) => {
    var Ae = kl();
    let Qt;
    var $t = C(Ae);
    {
      let Ot = /* @__PURE__ */ me(() => _a(h(W)));
      cr($t, {
        get state() {
          return h(Ot);
        },
        scale: 0.8
      });
    }
    var er = w($t, 1, !0), ya = w(er), ba = F(ya, !0);
    G(
      (Ot) => {
        X(Ae, "aria-pressed", h(s) === h(W)), Qt = it(Ae, 1, "svelte-nytrg3", null, Qt, { chosen: h(s) === h(W) }), R(er, h(W)), R(ba, Ot);
      },
      [() => r().filter((Ot) => Ot.status === h(W)).length]
    ), Te("click", Ae, () => N(s, h(s) === h(W) ? "" : h(W), !0)), k(q, Ae);
  });
  var ce = w(ot, 2), ye = C(ce), ve = w(ye), V = C(ve);
  V.value = V.__value = "date";
  var K = w(V);
  K.value = K.__value = "category";
  var re = w(K);
  re.value = re.__value = "department";
  var Le = w(re);
  Le.value = Le.__value = "channel", _n(ve);
  var Se = w(ve), Je = F(Se, !0), ft = w(Se), c = w(ft), p = F(c, !0), I = w(ce, 2);
  {
    var $ = (q) => {
      var W = wl();
      k(q, W);
    };
    he(I, (q) => {
      h(b) && q($);
    });
  }
  var pe = w(I, 2);
  {
    var Qe = (q) => {
      var W = yl(), Ae = F(W, !0);
      G(() => R(Ae, h(g))), k(q, W);
    };
    he(pe, (q) => {
      h(g) && q(Qe);
    });
  }
  var He = w(pe, 2), ct = C(He), zt = w(C(ct)), Rt = C(zt);
  Rt.value = Rt.__value = "activity";
  var Nt = w(Rt);
  Nt.value = Nt.__value = "requested_at";
  var j = w(Nt);
  j.value = j.__value = "completed_at";
  var le = w(j);
  le.value = le.__value = "created_at", _n(zt);
  var Kr = w(ct), pa = w(C(Kr)), Wr = w(Kr), Zr = w(C(Wr)), ga = w(Wr), Xr = w(He, 2), Jr = C(Xr), ma = F(Jr), ka = w(Jr), wa = F(ka), Qr = w(Xr, 2);
  let $r;
  dt(
    Qr,
    21,
    () => h(m),
    (q) => q.id,
    (q, W) => {
      ml(q, {
        get g() {
          return h(W);
        },
        get now() {
          return h(_);
        },
        get onopen() {
          return t.onopen;
        },
        get compact() {
          return h(v);
        }
      });
    },
    (q) => {
      var W = bl(), Ae = C(W), Qt = F(Ae, !0), $t = w(Ae), er = F($t, !0);
      G(() => {
        R(Qt, r().length ? "조건에 맞는 업무가 없습니다." : "첫 업무를 기록해 보세요."), R(er, r().length ? "검색어나 상태 필터를 바꿔보세요." : a() ? "담당자가 등록한 업무가 이곳에 표시됩니다." : "오른쪽 위 새 업무 등록 버튼으로 구두·메신저 요청을 접수하세요.");
      }), k(q, W);
    }
  ), G(() => {
    R(ie, n().cardEyebrow || "GENERAL AFFAIRS · LIVE BOARD"), R(L, n().cardTitle || "흩어진 요청을, 한 장의 보드로."), R(Xe, n().cardDescription || "분류별로 모으고, 상태별로 살펴보세요."), R(Tt, a() ? "조회 전용" : "업무 관리"), X(Ie, "aria-pressed", !h(s)), ut = it(Ie, 1, "svelte-nytrg3", null, ut, { chosen: !h(s) }), R(A, r().length), X(Se, "aria-pressed", h(v)), R(Je, h(v) ? "상세 보기" : "간략 보기"), c.disabled = h(d), R(p, h(d) ? "불러오는 중…" : "새로고침"), X(Zr, "min", h(f) || void 0), R(ma, `${h(m).length ?? ""}개 그룹 · ${h(x) ?? ""}건`), R(wa, `${h(l) === "date" ? "최신 날짜순 · 같은 날짜는 상태순" : "접수 → 진행 중 → 대기 → 완료 순"} · 한국 날짜 기준${h(o) === "activity" ? " · 완료는 완료일, 미완료는 요청일" : ""}`), $r = it(Qr, 1, "group-grid svelte-nytrg3", null, $r, { daily: h(l) === "date", compact: h(v) });
  }), Te("click", Ie, () => N(s, "")), yr(ye, () => h(i), (q) => N(i, q)), pn(ve, () => h(l), (q) => N(l, q)), Te("click", Se, () => N(v, !h(v))), Te("click", ft, function(...q) {
    t.onexport?.apply(this, q);
  }), Te("click", c, D), pn(zt, () => h(o), (q) => N(o, q)), yr(pa, () => h(f), (q) => N(f, q)), yr(Zr, () => h(u), (q) => N(u, q)), Te("click", ga, () => {
    N(f, ""), N(u, "");
  }), k(e, T), Wt();
}
Gr(["click"]);
function xl(e, t) {
  const r = Bi(El, { target: e, props: t });
  return () => Yi(r);
}
export {
  xl as mountBoard
};
