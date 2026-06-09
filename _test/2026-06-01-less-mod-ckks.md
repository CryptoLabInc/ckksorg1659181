---
layout: post
title: >
  Faster Bootstrapping for CKKS with Less Modulus Consumption
date: 2026-05-24 00:00:00-0400
description: >
  TL;DR: To improve efficiency and reduce the modulus consumption in standard CKKS bootstrapping, we propose two novel core techniques: level-conserving rescaling (LCR) and aggregated key-switching (AKS), which act on the matrix-vector multiplications in linear transformations and can be further combined into the lossless LCR+AKS. The contributions enable bootstrapping that consumes one fewer modulus level, improves throughput by 20%–35%, and reduces CtS rotation key size by 11.9%–15.2%, while preserving identical precision and failure probability.
author: Lianglin Yan
tags: 
categories: 
related_posts: false
toc:
  sidebar: right
giscus_comments: true
---

- Written by [Lianglin Yan](https://orcid.org/0009-0000-8378-9446) (Institute of Information Engineering, Chinese Academy of Sciences)
- Based on [https://ia.cr/2025/1403](https://eprint.iacr.org/2025/1403) (PKC 2026)

_TL;DR: To improve efficiency and reduce the modulus consumption in standard CKKS bootstrapping, we propose two novel core techniques: level-conserving rescaling (LCR) and aggregated key-switching (AKS), which act on the matrix-vector multiplications in linear transformations and can be further combined into the lossless LCR+AKS. The contributions enable bootstrapping that consumes one fewer modulus level, improves throughput by 20%–35%, and reduces CtS rotation key size by 11.9%–15.2%, while preserving identical precision and failure probability._

---

<br />
## Introduction
<div style="margin-top: 1.5em;"></div>

The standard CKKS bootstrapping comprises four steps: ModRaise, CtS, EvalMod, and StC. Many works have optimized these subroutines to improve the bootstrapping process. However, bootstrapping is still the performance bottleneck of the whole scheme, manifested mainly in the large computational overhead of CtS/StC and excessive modulus consumption. For example, in a 25-level CKKS scheme, as shown in [1], only 10 levels remain after bootstrapping for subsequent homomorphic computations. Here we focus on optimizing the linear transformations: CtS and StC (the technical descriptions mainly target CtS below, yet AKS is also applicable to StC).

In CKKS bootstrapping, homomorphic linear transformations are essentially homomorphic matrix-vector multiplications, and the state-of-the-art linear transformations were introduced in [1]. The authors employ matrix factorization from [2,3], which decomposes a DFT/iDFT matrix into several sparse diagonal matrices; thus, a matrix-vector multiplication becomes several sparse diagonal matrix-vector multiplications. This improves efficiency but consumes more depth.  Furthermore, the work [1] put forward the double-hoisting Baby-Step Giant-Step (BSGS) algorithm. The BSGS splits $r$ rotations into two parts:  baby-step rotations and giant-step rotations, reducing the number of homomorphic rotations to $O(\sqrt{r})$. Nevertheless, we found that for small $r$ (i.e., for sparse diagonal matrices), the performance gain of BSGS is limited. We aim to design a faster matrix-vector multiplication method specifically for sparse diagonal matrices. Our second goal is to reduce modulus consumption in CKKS bootstrapping.


**Notation.** We first provide some necessary notations. Let $N$ be a power-of-two integer, $q_0,q_1,\cdots, q_L,p_0,p_1,\cdots,p_{k-1}$ be $L+k+1$ distinct primes, and $Q_\ell=\prod_{i=0}^{\ell}q_i$, $P_j=\prod_{i=0}^j p_i$ for $0\le \ell \le L$ and $0\le j<k$. For simplicity, we write $P = P_{k−1}$. We define $\mathcal{R}_Q=\mathbb{Z}[X]/(X^N+1,Q)$, the cyclotomic polynomial ring over the integers modulo $Q$.
<br />

## Key ideas
<div style="margin-top: 1.5em;"></div>
Our work is built upon two core ideas: one is LCR, which saves one level of moduli, and the other is AKS, which accelerates sparse diagonal matrix-vector multiplication. We elaborate on the rationale behind these two methods as follows:
<br />

### Level-Conserving Rescaling
<div style="margin-top: 1.5em;"></div>
Rescaling is a fundamental operation in CKKS. It is usually performed after homomorphic multiplication to reduce the errors and restore the encoding factor in the ciphertext. It also reduces the modulus level of the ciphertext by one. We introduce a new rescaling operation that does not reduce the ciphertext level.

> **Core idea of LCR**: For ciphertext $$\mathtt{ct}\in\mathcal{R}_{Q_L}^2$$ encrypting plaintext $$\mathtt{pt}$$ under secret key $$\mathtt{sk}$$, if the coefficients of $$\mathtt{ct}$$ are small enough, specifically, $$\Vert\langle \mathtt{ct},\mathtt{sk}\rangle\Vert_{\infty}< Q_L /2$$, then the output ciphertext of the rescaling on $$\mathtt{ct}$$ can still be a valid ciphertext of $$\mathtt{pt}/q_L$$ in $$\mathcal{R}_{Q_L}^2$$.

**Why?** Recalling the CKKS decryption process, we know $$\langle \mathtt{ct},\mathtt{sk}\rangle = \mathtt{pt} + e + kQ_L$$ where $$\Vert\mathtt{pt} + e\Vert_{\infty} < Q_L/2$$, $e$ is an error and $k$ is a polynomial with integer coefficients. If $$\Vert\langle \mathtt{ct},\mathtt{sk}\rangle\Vert_{\infty}< Q_L /2,$$ then $k = 0$, i.e.,$$\langle \mathtt{ct},\mathtt{sk}\rangle=\mathtt{pt} + e$$. After rescaling $\mathtt{ct}'=\lfloor \frac{\mathtt{ct}}{q_L}\rceil$, we have
$$
\langle \mathtt{ct}',\mathtt{sk}\rangle \approx \frac{\mathtt{pt}+e}{q_L},
$$
thus 
$$
\left[  \langle \mathtt{ct}',\mathtt{sk}\rangle \right]_{Q_{L}}=\left[  \langle \mathtt{ct}',\mathtt{sk}\rangle \right]_{Q_{L-1}}.
$$

**Where does LCR apply?** LCR is only valid when $$\Vert\langle \mathtt{ct}, \mathtt{sk}\rangle\Vert_\infty < Q_L/2$$. In general, this condition is **not** satisfied because ciphertext coefficients look typically uniformly distributed over $$\mathbb{Z}_{Q_L}$$. However, an exception is the ciphertext immediately after applying ModRaise. ModRaise lifts the modulus from $q_0$ to $Q_L$ without changing the ciphertext polynomials; coefficients stay bounded by $$\Vert\mathtt{ct}\Vert_\infty \le q_0/2 \ll Q_L$$, hence $$\Vert\langle \mathtt{ct}, \mathtt{sk}\rangle\Vert_\infty \ll Q_L/2$$. LCR can therefore be applied once, right after ModRaise and before the first rotation/key-switching in CtS.
<br />

### Aggregated Key-Switching
<div style="margin-top: 1.5em;"></div>

Matrix–vector multiplication mainly involves homomorphic rotations (including key-switchings) and plaintext–ciphertext multiplications. The main idea of AKS is to re-encode the key-switching keys so that plaintext–ciphertext multiplication and rescaling are merged into the key-switching operation, reducing overall computation.

> **Core idea of AKS** (Merging plaintext–ciphertext multiplication and rescaling into key-switching): For a ciphertext $(c_0,c_1)$ with secret $s_1$, a standard switching key (from $s_1$ to $s_2$) encrypts $P s_1$ under $s_2$, and key-switching multiplies $P s_1$ by $c_1$, where $P$ is the auxiliary modulus. We instead encrypt $P m s_1 / q_L$ where $m$ is the plaintext used for plaintext-ciphertext multiplication, so that, after key-switching (including ModDown), the term $m s_1 c_1 / q_L$ is produced, which means that the key-switching also automatically completes scalar multiplication and rescaling operations on $c_1$. As a result, only scalar multiplication and rescaling on $c_0$ need to be evaluated separately, reducing the overall time complexity.

Note that merging plaintext-ciphertext multiplication into key-switching conflicts with the BSGS method. Therefore, the AKS method applies to sparse diagonal matrix-vector multiplication scenarios, and discarding BSGS causes no notable loss in efficiency.
<br />

## Methods: LCR, AKS, LCR+AKS
<div style="margin-top: 1.5em;"></div>
Below we provide the concrete algorithms, including the combined LCR+AKS, and explain how to use them in CKKS bootstrapping.
<br />

### LCR Algorithm for the First Matrix–Vector Multiplication in CtS
<div style="margin-top: 1.5em;"></div>
The algorithm of level-conserving rescaling is the same as the ordinary CKKS rescaling except that the output $\mathtt{ct}'$ is treated as a ciphertext at level $Q_L$.

$$
\textbf{LCRescale}(\mathtt{ct}):\quad \mathtt{ct}' = \Bigl\lfloor \frac{\mathtt{ct}}{q_L} \Bigr\rceil \in \mathcal{R}_{Q_L}^2.
$$

**Correctness:** if $\Vert\langle \mathtt{ct}, \mathtt{sk}\rangle\Vert_\infty < Q_L/2$, then $\mathtt{ct}'$ encrypts $\mathtt{pt}/q_L$ under $\mathtt{sk}$ at modulus $Q_L$.

**Using LCR in CtS.** Standard CtS performs key-switching during every rotation. Key-switching involves an inner product with the switching key and spreads the ciphertext coefficients uniformly over $\mathbb{Z}_{Q_L}$, so LCR **cannot** be used after the first rotation. To apply LCR on the first sparse matrix–vector multiplication after ModRaise, we postpone rotations: for each non-zero diagonal $j$, encode the shifted diagonal, compute plaintext–ciphertext multiplication, apply LCRescale, and only then homomorphically rotate and add—this is a *level-conserving* matrix-vector multiplication. It saves one modulus level in bootstrapping but has two structural costs on that matrix:

1. **BSGS must be dropped** in the first step, because scalar multiplication and rescaling must happen *before* key-switching/rotation; the usual baby-step/giant-step loop is incompatible with LCR.
2. The step requires $r$ rotations (one per non-zero diagonal) instead of the $O(\sqrt{r})$ rotations of BSGS, and LCRescale is repeated $r$ times instead of a single rescaling at the end.

**Redistributing non-zero diagonals.** CtS relies on matrix factorization [2,3]: the DFT/iDFT matrix is split into several sparse diagonal factors. When BSGS is removed from the first factor, efficiency is most sensitive to the number of non-zero diagonals $r$. Discarding BSGS is essentially optimal when $r \le 16$, and still nearly optimal for $r = 32$; for $r = 64$ the overhead grows but can be offset by AKS. In practice, one chooses the factorization depth and diagonal budget so that the **first** matrix (the LCR step) keeps a modest $r$ (e.g., $8$ or $16$), while later matrices—evaluated with ordinary BSGS—may use the remaining diagonal budget. This allocation alleviates the efficiency loss caused by dropping BSGS.
<br />

### AKS Algorithm for Sparse Diagonal Matrix–Vector Multiplications
<div style="margin-top: 1.5em;"></div>
As discussed earlier, we first design the AKS keys and then use them to construct the matrix-vector multiplication algorithm.

**AKS keys.** Let $$L+1=\alpha \cdot \beta$$, $$D_j=\prod_{i=j\alpha}^{(j+1)\alpha-1}q_i$$. For hybrid key-switching with decomposition bases $$\{D_j\}_{0\le j< \beta}$$, $$\hat{D}_j=Q/D_j$$ and $$D_j^*=\Bigl[\hat{D}_j^{-1}\Bigr]_{D_j}$$, the AKS key from $$s_1$$ to $s_2$ is defined as (plaintext $m$ from the DFT/iDFT diagonal encoding, modulus $Q_L$):

$$
\mathtt{evk}_j = \Biggl(\Biggl[-a_j s_2 + \Bigg\lfloor\frac{\bigl[P m s_1 \hat{D}_j D_j^*\bigr]_{P Q_L}}{q_L}\Bigg\rceil + e_j\Biggr]_{P Q_L},\; [a_j]_{P Q_L}\Biggr),
$$

where $a_j \leftarrow U(\mathcal{R}_{P Q_L})$ and $e_j$ is sampled from the error distribution. 

**AKS operation.** Given $$\mathtt{ct} = (c_0, c_1) \in \mathcal{R}_{Q_L}^2$$ that encrypts $$\mathtt{pt}$$ under $$s_1$$ at modulus $Q_{L}$, the AKS operation proceeds in three steps: 
1. **Key-switching:** 
  $$(d_0, d_1) = \left\lfloor \frac{1}{P} \left( \sum_{j=0}^{\beta-1} [c_1]_{D_j} \cdot \text{evk}_j \pmod {P Q_{L-1}} \right) \right\rceil \in \mathcal{R}_{Q_{L-1}}^2.$$
1. **ScalarMult+Rescale on $c_0$:** $$c_0' = \left\lfloor \frac{m \cdot c_0}{q_L} \right\rceil\in \mathcal{R}_{Q_{L-1}}$$. 
2. **Addition:** $\mathtt{ct}' = (d_0 + c_0', d_1)$. 

The output encrypts $$m \cdot \mathtt{pt} / q_L$$ under $s_2$ at modulus $Q_{L-1}$. 

**New matrix-vector multiplication.** Applying the AKS operation, we design a new matrix-vector multiplication algorithm, which adopts the hoisting approach but drops the BSGS method. The improved algorithm is:

1. **Decompose:** Compute $$[c_1]_{D_j}$$ for $0\le j<\beta$.
2. **AKS operation:** For each $i\in\left[0,r\right)$, perform inner-product using $$[c_1]_{D_j}$$ and the aggregated rotation keys (KS+ScalarMult+Rescale on $$c_1$$), followed by the ModDown procedure (divided by $P$).
3. **ScalarMult+Rescale**: Multiply $c_0$ by $m$ then rescale by $q_L$. 
4. **Addition:** Rotate all $r$ ciphertexts accordingly and add them together.

Compared with the matrix-vector multiplication with $O(\sqrt{r})$ rotations based on the BSGS method, the new algorithm requires $O(r)$ rotations, but the process is much simpler: it cuts down scalar multiplication and rescaling operations on $c_1$, and eliminates extra NTT/iNTT computations between baby-step and giant-step loops. Theoretically, the AKS-based algorithm is more efficient when the number of non-zero diagonals is small ($r \le 64$). The space overhead increases due to the larger number of rotation keys.
<br />

### LCR + AKS Algorithm for the First Matrix–Vector Multiplication in CtS
<div style="margin-top: 1.5em;"></div>
Overall, LCR saves modulus consumption at the cost of higher computational overhead, while AKS improves efficiency at the cost of increased space overhead. Here we combine LCR and AKS for the first sparse matrix multiplication in CtS, yielding a **lossless** improvement. Compared with the AKS-based matrix-vector multiplication, LCR+AKS involves three changes:

1. **Modulus level is preserved:**  The output of the AKS operation stays in $\mathcal{R}_{Q_L}^2$.
2. **LCRescale:** The regular Rescale is replaced by LCRescale on the $c_0$ branch.
3. **GHS-type key-switching:** In key-switching, the GHS-type key-switching is used instead of hybrid key-switching, i.e., the rotation key is
$$
\mathtt{evk} = \Biggl(\Biggl[-a s_2 + \Bigg\lfloor\frac{\bigl[P m s_1 \bigr]_{P Q_L}}{q_L}\Bigg\rceil + e\Biggr]_{P Q_L},\; [a]_{P Q_L}\Biggr).
$$

**Why GHS-type?** Hybrid key-switching involves the CRT composition $$\sum_{j=0}^{\beta-1} [c_1]_{D_j} \cdot \hat{D}_j D_j^* = c_1 + k_2 Q_L$$, where $$k_2$$ is a polynomial with integer coefficients. After rescaling by $q_L$, the term $k_2 Q_L$ becomes $$k_2 Q_{L-1}$$, which cannot be eliminated by modulo $Q_L$, making LCR inapplicable. Therefore, we use the GHS-type key-switching. We **keep the same auxiliary modulus $P$** as in the hybrid key-switching because post-ModRaise ciphertexts have small coefficients and thus introduce small key-switching noise.

Two other advantages of GHS-type key-switching are: 
- It reduces the time complexity of the Decompose and MultSum steps by a factor of $\beta$ since the ciphertext $c_1$ no longer needs to be decomposed; 
- It reduces the size of each $\mathtt{evk}$ by a factor of $\beta$.

Therefore, the LCR+AKS method achieves comprehensive improvements in modulus consumption, computational efficiency, and storage space, realizing a lossless performance enhancement.
<br />

### Application to Bootstrapping
<div style="margin-top: 1.5em;"></div>

We apply LCR+AKS to the first matrix–vector multiplication in CtS to save one modulus level. With sparse-secret encapsulation [4], the key-switching for decapsulation is merged into the aggregated key-switching in the first matrix-vector multiplication, which accelerates the ModRaise step.

For the remaining matrices in CtS (and StC), one can use the AKS-based algorithm or the double-hoisting BSGS method according to the available storage resources. The more AKS is used, the more rotation keys are required. This gives rise to a lossless bootstrapping strategy and some time–memory trade-off bootstrapping strategies (illustrated in Fig. 1). 

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2606_Lianglin/fig1.jpg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
**Figure 1.** Flowchart of the CtS procedure in prior works [1, 4] (top), lossless strategy (middle), and time–memory trade-off strategy (bottom).
<!-- <div class="caption">
    Figure 1. Flowchart of the CtS procedure in prior works [1, 4] (top), lossless strategy (middle), and time-memory trade-off strategy (bottom). 
</div> -->

<!-- <p align="center">
  <img src="fig1.jpg" alt="CoeffsToSlots: prior BSGS (top), lossless LCR+AKS then BSGS (middle), trade-off LCR+AKS then AKS (bottom)" style="max-width: 100%; height: auto;" />
</p>

**Figure 1.** Flowchart of the CtS procedure in prior works [1, 4] (top), lossless strategy (middle), and time–memory trade-off strategy (bottom).  -->

<br />

## Results
<div style="margin-top: 1.5em;"></div>
We employ the lossless strategy based on the sparse-secret encapsulation bootstrapping [4].
All experiments were conducted on an Intel Core i7-9700 (3.00 GHz) running Windows 10 with single-thread execution and 256 GB storage space. Our code is developed upon the Lattigo library. As the baseline, we reproduced the sparse-secret encapsulation bootstrapping in [4] on the same machine. The experimental results, shown in Table 1, can be summarized as follows:

1.  **Improved Computational Efficiency**: LCR+AKS  reduces the running time of ModRaise and the first matrix-vector multiplication in CtS.  Specifically, ModRaise, including sparse secret en/decapsulations,  achieves roughly 9.4–9.8× speedup, and the first matrix-vector multiplication gains a 3.0–3.5× speed boost.
2.  **Enhanced Throughput**: The overall bootstrapping throughput rises by 20%–35% against the baseline, with bootstrapping precision and failure probability fully preserved.
3.  **Saved Modulus Resource**: One modulus level is saved.
4.  **Optimized Key Storage**: Despite the increased number of rotation keys, the total size of CtS rotation keys drops by around 12%–15%. This benefit stems from the smaller individual key size under the LCR+AKS scheme.

**Table 1.** Bootstrapping performance comparison against baseline scheme from [4]. Parameter sets are from [4]. rtk means rotation keys.

<!-- | Set      | ModRaise time(s) | Mat1 (32) | Mat2 (15) | Mat3 (15) | Mat4 (31) | BTS time(s) | Left Levels | BTS Precision | $\log(\textbf{Throughput})$| CtS rtk size (GB) |
|:--------:|:---------------:|:---------:|:---------:|:---------:|:---------:|:----------:|:----------------------:|:--------------------:|:----------------------:|:-------------:|
| I-[4]    | 1.14            | 3.62      | 1.85      | 1.79      | 3.34      | 25.98      | 14                    | 27.8                 | 24.28                  | 5.47          |
| I′-our   | **0.12**        | **1.19**  | 1.88      | 1.81      | 3.29      | 23.20      | **15**                | 27.8                 | **24.54**              | **4.82**      |
| II-[4]   | 1.18            | 3.87      | 1.98      | 1.98      | 3.13      | 27.99      | 10                    | 32.9                 | 24.09                  | 6.19          |
| II′-our  | **0.12**        | **1.10**  | 1.81      | 1.73      | 3.24      | 22.91      | **11**                | 32.9                 | **24.52**              | **5.25**      |
| III-[4]  | 1.03            | 3.45      | 1.82      | 1.52      | 2.78      | 23.37      | 12.5                    | 19.7                 | 24.29                  | 5.81          |
| III′-our | **0.11**        | **1.03**  | 1.73      | 1.74      | 2.69      | 20.21      | **13.5**                | 19.7                 | **24.62**              | **4.93**      | -->


<div style="overflow-x: auto; margin-bottom: 1.0em;">
<table style="border-collapse: collapse; border: 1px solid; min-width: 100%;">
  <thead>
    <tr style="border-bottom: 2px solid ">
      <th style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Set</th>
      <th style="border: 1px solid; padding: 6px 12px;">ModRaise time(s)</th>
      <th style="border: 1px solid; padding: 6px 12px;">Mat1 (32)</th>
      <th style="border: 1px solid; padding: 6px 12px;">Mat2 (15)</th>
      <th style="border: 1px solid; padding: 6px 12px;">Mat3 (15)</th>
      <th style="border: 1px solid; padding: 6px 12px;">Mat4 (31)</th>
      <th style="border: 1px solid; padding: 6px 12px;">BTS time(s)</th>
      <th style="border: 1px solid; padding: 6px 12px;">Left Levels</th>
      <th style="border: 1px solid; padding: 6px 12px;">BTS Precision</th>
      <th style="border: 1px solid; padding: 6px 12px;">$\log(\textbf{Throughput})$</th>
      <th style="border: 1px solid; padding: 6px 12px;">CtS rtk size (GB)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">I-[4]</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.14</td>
      <td style="border: 1px solid; padding: 6px 12px;">3.62</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.85</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.79</td>
      <td style="border: 1px solid; padding: 6px 12px;">3.34</td>
      <td style="border: 1px solid; padding: 6px 12px;">25.98</td>
      <td style="border: 1px solid; padding: 6px 12px;">14</td>
      <td style="border: 1px solid; padding: 6px 12px;">27.8</td>
      <td style="border: 1px solid; padding: 6px 12px;">24.28</td>
      <td style="border: 1px solid; padding: 6px 12px;">5.47</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>I′-our</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>0.12</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>1.19</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;">1.88</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.81</td>
      <td style="border: 1px solid; padding: 6px 12px;">3.29</td>
      <td style="border: 1px solid; padding: 6px 12px;">23.20</td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>15</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;">27.8</td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>24.54</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>4.82</strong></td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">II-[4]</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.18</td>
      <td style="border: 1px solid; padding: 6px 12px;">3.87</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.98</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.98</td>
      <td style="border: 1px solid; padding: 6px 12px;">3.13</td>
      <td style="border: 1px solid; padding: 6px 12px;">27.99</td>
      <td style="border: 1px solid; padding: 6px 12px;">10</td>
      <td style="border: 1px solid; padding: 6px 12px;">32.9</td>
      <td style="border: 1px solid; padding: 6px 12px;">24.09</td>
      <td style="border: 1px solid; padding: 6px 12px;">6.19</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>II′-our</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>0.12</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>1.10</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;">1.81</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.73</td>
      <td style="border: 1px solid; padding: 6px 12px;">3.24</td>
      <td style="border: 1px solid; padding: 6px 12px;">22.91</td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>11</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;">32.9</td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>24.52</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>5.25</strong></td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">III-[4]</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.03</td>
      <td style="border: 1px solid; padding: 6px 12px;">3.45</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.82</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.52</td>
      <td style="border: 1px solid; padding: 6px 12px;">2.78</td>
      <td style="border: 1px solid; padding: 6px 12px;">23.37</td>
      <td style="border: 1px solid; padding: 6px 12px;">12.5</td>
      <td style="border: 1px solid; padding: 6px 12px;">19.7</td>
      <td style="border: 1px solid; padding: 6px 12px;">24.29</td>
      <td style="border: 1px solid; padding: 6px 12px;">5.81</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>III′-our</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>0.11</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>1.03</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;">1.73</td>
      <td style="border: 1px solid; padding: 6px 12px;">1.74</td>
      <td style="border: 1px solid; padding: 6px 12px;">2.69</td>
      <td style="border: 1px solid; padding: 6px 12px;">20.21</td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>13.5</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;">19.7</td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>24.62</strong></td>
      <td style="border: 1px solid; padding: 6px 12px;"><strong>4.93</strong></td>
    </tr>
  </tbody>
</table>
</div>

The time–memory trade-off strategy can reach up to 40% higher throughput at the cost of doubling CtS rotation key size.
<br />

## References
<div style="margin-top: 1.5em;"></div>

[1] Bossuat, J.P., Mouchet, C., Troncoso-Pastoriza, J., and Hubaux, J.P. "Efficient Bootstrapping for Approximate Homomorphic Encryption with Non-sparse Keys." EUROCRYPT 2021.

[2] Chen, H., Chillotti, I., and Song, Y. "Improved Bootstrapping for Approximate Homomorphic Encryption." EUROCRYPT 2019.

[3] Han, K., Hhan, M., and Cheon, J.H. "Improved Homomorphic Discrete Fourier Transforms and FHE Bootstrapping." IEEE Access 2019.

[4] Bossuat, J.P., Troncoso-Pastoriza, J.R., and Hubaux, J.P. "Bootstrapping for Approximate Homomorphic Encryption with Negligible Failure-probability by using Sparse-secret Encapsulation." ACNS 2022.



