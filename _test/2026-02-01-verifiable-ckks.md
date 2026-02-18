---
layout: post
title: >
  Verifiable Computation for CKKS
date: 2026-01-01 11:12:00+0200
description: >
  TL;DR: Homomorphic Encryption (HE) enables computing over encrypted data but, by itself, provides no guarantees that the computation was honestly executed. One can build "Verifiable HE" (vHE) using SNARKs, but efficiently combining HE and SNARKs in practice is a major challenge. This work introduces a blueprint for building verifiable HE schemes and its efficient instantiation for CKKS. Our first step is to introduce a "proof-friendly" version of CKKS, which is more amenable to proof systems, while being only slightly slower than typical RNS CKKS implementations. We then show how the problem of proving correctness of computations for such proof-friendly HE schemes can be reduced to just two sets of arithmetic relations (containing equalities and inequalities). We show that if these are satisfied, it implies the correct execution of the HE evaluation. We design Polynomial Interactive Oracle Proofs (PIOPs) for efficiently proving these relations, and we show how they can be instantiated using standard proof components. Our final construction demonstrates the feasibility of building SNARKs for proving computation of full-fledged HE schemes, opening the path for building practical verifiable HE schemes.
author: Ignacio Cascudo, Anamaria Costache, Daniele Cozzo, Dario Fiore, Antonio Guimarães, Eduardo Soria-Vazquez
tags: 
categories: 
related_posts: false
pretty_table: true
giscus_comments: true
toc:
  sidebar: right
---

- Written by Ignacio Cascudo (IMDEA Software Institute), Anamaria Costache (École Polytechnique), Daniele Cozzo (IMDEA Software Institute), Dario Fiore (IMDEA Software Institute), Antonio Guimarães (IMDEA Software Institute), Eduardo Soria-Vazquez (Technology Innovation Institute)
- Based on [https://ia.cr/2025/286](https://ia.cr/2025/286) (Crypto 2025)

*TL;DR: Homomorphic Encryption (HE) enables computing over encrypted data but, by itself, provides no guarantees that the computation was honestly executed. One can build "Verifiable HE" (vHE) using SNARKs, but efficiently combining HE and SNARKs in practice is a major challenge. This work introduces a blueprint for building verifiable HE schemes and its efficient instantiation for CKKS. Our first step is to introduce a "proof-friendly" version of CKKS, which is more amenable to proof systems, while being only slightly slower than typical RNS CKKS implementations. We then show how the problem of proving correctness of computations for such proof-friendly HE schemes can be reduced to just two sets of arithmetic relations (containing equalities and inequalities). We show that if these are satisfied, it implies the correct execution of the HE evaluation. We design Polynomial Interactive Oracle Proofs (PIOPs) for efficiently proving these relations, and we show how they can be instantiated using standard proof components. Our final construction demonstrates the feasibility of building SNARKs for proving computation of full-fledged HE schemes, opening the path for building practical verifiable HE schemes.*

---
<br />
## Context
<div style="margin-top: 1.5em;"></div>

**Homomorphic Encryption.** Homomorphic Encryption (HE) is a type of encryption that allows to compute on encrypted data. This allows, amongst others, to outsource computations without compromising on privacy. 
It is a very powerful primitive, which enables many applications such as secure outsourced medical analysis, private set intersection, and so on. 
In recent years, Machine Learning (ML) applications have become ubiquitous. While this has opened up the door to many novel and powerful applications, this has also introduced privacy concerns. Indeed, ML applications inherently and very heavily rely on data - but this data can turn out to be sensitive, and users may rightly be weary of sharing their private data with companies. To the rescue comes HE, in the form of Privacy-Preserving Machine Learning (PPML)! With HE, we can now encrypt the data, and evaluate an ML model directly on encrypted data. The result can now be recovered in plaintext, but only by whoever holds the secret key. 

**Verifiable Homomorphic Encryption.** A significant limitation of homomorphic encryption (HE) is that it works in the trusted model, where the entity that computes over the ciphertexts is assumed to behave honestly. In particular, we must assume that the computing party (from here on, we refer to this party as the *server*) performs exactly the operation it says it does, which in practice is a rather strong assumption. In reality, without an integrity mechanism on top of the computation, the server could follow any malicious strategy: it could for example bias the result, or perform a different computation entirely. Even more concerning, without integrity mechanisms in place, the server could take advantage of the malleability of HE ciphertexts and mount a key recovery attack. Therefore, a lack of integrity can potentially lead to serious privacy leaks!

### SNARKs

*Succinct proof systems* (commonly referred to as SNARKs) are an important cryptographic primitive that allow to add integrity to computations. Informally, these are cryptographic proofs that allow a prover to convince a verifier that a statement is true. This is a very rich research field in and of itself, so for now, we can think of SNARKs as tools that allow us to prove a statement of the following kind: "Given a public circuit $C$ and an output $y$, I know an input $x$ such that $y=C(x)$." 

What makes SNARKs useful in practice are the following properties: 
- **Correctness**: if the statement is true, then the verifier will accept the proof; 
- **Soundness**: a cheating prover is not able to convince the verifier about a false statement, except with negligible probability; 
- **Succinctness**: the proof is very short and verifying it should be fast, e.g. sublinear in the size of the computation.

### Verifiable HE

It is natural then to combine SNARKs and HE to achieve both privacy and integrity in outsourcing computations. This approach, also known as *Verifiable Homomorphic Encryption (vHE)* does work in theory, because SNARKs can prove NP statements. Unfortunately, in practice this approach has several limitations for the prover efficiency.

 1) HE ciphertexts are typically pairs of elements of the polynomial ring $R_q = \mathbb{Z}_q[X]/{(X^{N}+1)}$, whereas SNARKs typically work best on computations over large finite fields; 

 2) Virtually all HE schemes require so-called *ciphertexts maintenance* operations (such as rescaling). These operations entail non-algebraic operations, for instance real division and rounding. In contrast, SNARKs shine at proving algebraic statements. Even worse, operations like rescaling cause the underlying algebraic structure to change during the computation, something that cannot be easily processed by traditional SNARKs.

Naively, general-purpose SNARKs can prove ciphertext arithmetic and maintenance operations by emulating them. This is prohibitively expensive for the prover, as shown by a recent survey by Knabenhans, Viand, and Hithnawi [4].

This motivates the research line of designing SNARKs *specifically tailored to HE operations*.

In this blogpost, we introduce our recent result [1] that represents the state-of-the-art in this direction. Our work is a blueprint for constructing vHE schemes that can scale with large computations and have practical proving times.

<br />
## The blueprint
<div style="margin-top: 1.5em;"></div>

The core contributions of our work are a blueprint for constructing practical vHE schemes in a modular way and its instantiation to the CKKS scheme. Such a framework consists of several building blocks that are carefully designed to be combined together to yield the final vHE scheme. 

<figure class="figure-class">
    <div class="row mt-3">
        <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
            {% include figure.liquid loading="eager" path="assets/img/blog/2602_DanieleCozzo/image.png" class="img-fluid rounded z-depth-1" zoomable=true %}
        </div>
    </div>
    <figcaption class="figure-caption" style="text-align: center;">
Figure 1: The Blueprint.
    </figcaption>
</figure>

The first step in our blueprint is to take an HE scheme, and modify it in such a way that it becomes more "SNARK-friendly". The aim is to make arithmetization easier -- that is to say, we aim to make the operations of the HE scheme easily expressed in a language that can then be processed by the SNARK with small overhead. We call such a scheme "proof-friendly". In practice, such a scheme must work over a **single** ring with **specific algebraic structures** that are necessary for the SNARKs to achieve soundness. In this work, we instantiate our blueprint using the CKKS scheme, introducing a proof-friendly variant of CKKS. 

Once we have a proof-friendly HE scheme, a computation over its ciphertexts is processed according to the following steps:
- **Translation**: The arithmetization process translates the computation into an arithmetic circuit satisfiability relation over the ring, and a finite number of range check relations over the ring. This is the language our SNARK "speaks".
- **Proofs**: These relations will be proved by specialized proof systems, in the form of *Polynomial Interactive Oracle Proofs (PIOPs)*. PIOPs are proof systems where the interaction between the prover and verifier happens via polynomials: the statements are encoded by long polynomials and the proof consists in evaluating these over points chosen uniformly at random by the verifier. Importantly, PIOPs differ from SNARKs in that they are interactive, are not succinct (meaning that the proof is typically long, of the size of the statement) and soundness holds information-theoretically. 
A popular and practical way of realizing SNARKs, which we follow, consists in first designing PIOPs, and then compiling them into full-fledged SNARKs through cryptographic tools (we will talk about this in a moment). In our case, we need two PIOPs: one that is specialized to prove arithmetic statements over rings, and one specialized to prove range checks over rings. 
- **Cryptographic compiler**: Finally, in order to compile these information-theoretic protocols into a SNARK we need one more tool, called a *Polynomial commitment* (PC) scheme. This is a primitive that allows the prover to commit to a large polynomial resulting in a short string, and to later prove evaluations of the committed polynomial. Polynomial commitment schemes are used to compile PIOPs into SNARKs: the long polynomials resulting from the prover PIOP are replaced by the short commitments.

<br />
## Proof-friendly CKKS
<div style="margin-top: 1.5em;"></div>

We start by showing how we can build a proof-friendly version of CKKS which presents the characteristics described above while maintaining near state-of-the-art performance levels. 

### Setting up the ring
CKKS works over polynomial rings of the form $R_q := \mathbb{Z}_q[X]/(X^N+1)$. The first step is to set up the ring $R_q$ such that it will be easier to construct a SNARK over it. Remember, one of the properties a SNARK must satisfy is soundness: this says that if the statement is false, then the prover is only able to convince the verifier with negligible probability. 

Naively, a way to achieve this is to just repeat the proof system as many times as needed, to amplify soundness error. However, this makes the proof much larger, and one might need many repetitions to achieve negligible soundness error. The alternative is to choose the ring $R_q$ in an appropriate way, so that no repetitions are needed. 

The second requirement is, of course, efficiency. We want the prover to be fast while performing the CKKS operations. For that reason, as is typical in HE, we invoke the Chinese Remainder Theorem (CRT). Let $N$ be a power of two and $q:= \prod_{i=0}^L p_i$ for some integer $L$, such that each $p_i$ is a prime of the form $2aN/d + 1$ for some odd integer $a$ and suitable power-of-two value $d$. 
Then, for each $p_i$, the cyclotomic polynomial $X^N+1$ splits in $$\mathbb{Z}_{p_i}[X]$$ into $k = N/d$ irreducible factors
$$X^N + 1 = \prod_{j=0}^{k-1}(X^d - \zeta^{(2j+1)}),$$
where $$\zeta\in\mathbb{Z}_{p_i}$$ is a $$2N/d$$-th primitive root of unity. By the CRT, the ring $$R_{q}$$ splits as

$$R_{q} = \prod_{i=0}^L R_{p_i} = \prod_{i=0}^L \left( \prod_{j=0}^{k-1} R_{i,j} \right), \tag{1}$$

with each $$R_{i,j} = \mathbb{Z}_{p_i}[X]/(X^d - \zeta^{(2j+1)})$$ being a field of size $p_i^d$. 

The value $d$ will be chosen appropriately so as to guarantee soundness security. For brevity, we omit a detailed discussion on choosing the value $d$, but note that typical choices for $d$ would be $d=2$, or $d=4$. We refer to [1] for details on efficient arithmetic over the rings these choices entail.

### Algorithms
Now that we have set up the underlying ring $R_q$, we are ready to describe the main algorithms for our proof-friendly CKKS. In more detail, we present a modified version of the CKKS scheme. At a high level, these modifications aim to get around of the hurdles which makes CKKS incompatible with SNARKs, namely the fact that the ring changes during the computation. In our version of CKKS, the algorithms will always work on the same underlying ring $R_q$. The trick that makes this possible is a modification of the CRT map underlying the RNS version of CKKS, which we show now.

For all $0 \leq j \leq L$ define $q_j = \prod_{i=0}^{j} p_{i}$, and in particular $q_L = q$. Then we define $$R := \mathbb{Z}[X]/(X^N+1)$$ and $$R_{q_j} := \mathbb{Z}_{q_j}[X]/(X^N+1)$$ for all $0 \leq j \leq L$. Let $\omega_{j} = (p_0, p_1, \dots, p_{j})$ be a CRT base for $q_j$ and given $a \in R_{q}$, we define the inverse CRT map as follows:

$$CRT^{-1}_{\omega_{j}}(a) := \left( \left[ a\right]_{p_0}, \left[ a \right]_{p_1}, \dots, \left[ a \right]_{p_{j}} \right) \in R_{q}^{j+1}.$$

Note that, in general, the inverse CRT for $\omega_j$ would be defined as a map $R_{q} \rightarrow R_{p_0} \times \ldots \times R_{p_j}$. We slightly modify this, by adding an embedding from $R_{p_0} \times \ldots \times R_{p_{j}}$ to $R_{q}^{j+1}$.
More precisely, our mapping looks like:

$$\begin{aligned}R_{q_0} ~~ &\longrightarrow \qquad  R_{p_0} \times \ldots \times R_{p_j} \qquad \longrightarrow \quad  R_{q}^{j+1} \\
a ~~~ &\mapsto ~ \mathbf{a} := \left( \left[ a\right]_{p_0}, \left[ a\right]_{p_1}, \dots,\left[
a\right]_{p_{j}}\right) \rightarrow \left(\mathbf{a}'_0, \ldots, \mathbf{a}'_j \right),\end{aligned}$$

where, using RNS representation,

$$\mathbf{a'}_i = \left( \left[ \left[ a\right]_{p_i} \right]_{p_0}, \left[ \left[ a\right]_{p_i}\right]_{p_1}, \dots,\left[ \left[ a\right]_{p_i}
\right]_{p_{j}}, \underbrace{0 \ldots, 0}_{L-j ~\text{times}}\right) \in R_q.$$

Letting $Q_{i} = q_L/p_i$ and $$\hat{Q}_{i} = \left[(q_L/p_i)^{-1}\right]_{p_i}$$ be the usual constants for CRT recomposition, we define 

$$z_j := \sum_{i=0}^{j} Q_i\hat{Q}_i = CRT(\underbrace{1, \dots, j}_{j+1~\text{times}}, 0, \dots, 0) \in R_{q}.$$

For each $0 \leq j \leq L$, the CRT recomposition vector for a given $a \in R_{q}$ is:

$$PW_{\omega_{j}}(a) := \left(\left[ aQ_{0}\hat{Q}_{0} \right]_{q}, \left[ 
	aQ_{1}\hat{Q}_{1} 
	\right]_{q}, \dots, \left[ aQ_{j}\hat{Q}_{j} \right]_{q} \right) \in R_q^{j+1} .$$

For any $a, b \in R_{q}$, for any $j$, the following holds

$$
a \cdot b \cdot z_j \equiv \langle PW_{\omega_{j}}(a), CRT^{-1}_{\omega_{j}}(b) \rangle \cdot z_j 
\pmod{q_0}. 
$$

This follows from a direct application of the CRT in the ideal defined by $z_j$.

We are ready to describe the algorithms defining our proof-friendly version of CKKS. Let $q_{0} < q_{1} < \dots < q_{D-1}$ be a chain of moduli for a circuit of depth $D$ and $(\omega_{0}, \omega_{1}, \dots, \omega_{D-1})$ their respective CRT bases, $\chi_\text{key}$ be the secret key distribution over $R$, and $\chi_\text{err}, \chi_\text{enc}$ be discrete Gaussian distributions over $R_{q}$. Below we present our version of the CKKS scheme. For brevity, we only present the algorithms which are different from "regular CKKS". 

- $\mathsf{EvalKeyGen}:$ Let the secret key be $s$, and assume we are performing a key switching from $s^2$ to $s$. Sample $a_i \leftarrow R_{q}$, sample $e_i \leftarrow \chi_\text{err}$ for $i= 0, \dots, L$. 
Compute $b_i = - a_i \cdot s + e_i + PW_{\omega_{L}}(s^2)[i]\pmod{q}$. For each level $l \in \{ 0, \dots, D - 1\}$, compute

$$\mathfrak{evk}_l := (\mathfrak{evk}_{l,0}, \mathfrak{evk}_{l,1}) \leftarrow \left( (z_l b_i)_{i=0, \dots,
l}, (z_l a_i)_{i=0, \dots, l} \right) \in \left( R_{q}^2 \right)^{l+1}.$$

Notice that all key switching keys are generated in $R_{q}$ for all levels, but we *manually* change levels by moving them to the ideals defined by $z_l$. In practice, zeroed RNS components do not need to be processed, yielding similar performance as typical RNS implementations.

- $\mathsf{Mult}(ct_0, ct_1, l):$ Multiplication of two ciphertexts $ct_0 := (ct_0[0], ct_0[1])$, $ct_1 := (ct_1[0], ct_1[1])$ at the same multiplicative level $l$ goes as follows. First a *pre-multiplication* performs a polynomial multiplication

	$$
		(d_0, d_1, d_2) := (ct_0[0] \cdot ct_1[0], ct_0[0] \cdot ct_1[1] + ct_1[0] \cdot ct_0[1], ct_0[1] \cdot ct_1[1]) \in R_q^3.
	$$ 

	Then, we perform the *key switching* as follows.

	$$
		D_i := d_i + \langle CRT_{\omega_l}^{-1}(d_2), \mathfrak{evk}_{l,i} \rangle \in R_{q}, \quad i=0,1. 
	$$

	Then we *re-scale* $D_0, D_1$ as follows. Let $$p_l^{-1} = \left[q_{l+1}/q_{l}\right]_{q_{j+1} } \cdot z_l \in R_{q}$$. Then compute and output the final ciphertext

	$$
	c_i := \left( D_i - \left[D_i\right]_{p_l}\right) p^{-1}_l \in R_{q},\quad i=0,1.
	$$

A detailed noise analysis can be found in the full version of our paper. We omit it here for brevity, but we show that our CKKS incurs *at most* one additional bit of noise. 

<br />
## Arithmetization
<div style="margin-top: 1.5em;"></div>

Now that we have a proof-friendly HE scheme, we describe how we can translate it into a finite set of relations over $R_q$, which, if satisfied, imply the correct execution of the scheme.
Although we focus specifically on our (proof-friendly) CKKS additions and multiplications, we note that this process could be extended to any operations or schemes satisfying our desirable "proof-friendly" characteristics. 

### Additions

Let two ciphertexts $$a = (a_0, a_1)$$, $$b=(b_0, b_1) \in R_q^2$$ be at the same level $l$. Adding $a$ and $b$ can be readily expressed as an arithmetic circuit satisfiability relation over $R_q$, since the resulting ciphertext
$$
c = (c_0, c_1) := (a_0 + b_0, a_1 + b_1)
$$
is simply the component-wise addition of $a$ and $b$ over $R_q^2$. 

### Multiplications

Suppose that now we want to multiply the ciphertexts $a$ and $b$. That means that the ciphertexts $a, b$ are actually elements in $R_{q_l}$, although our CKKS treats them as elements in $R_q$. We know that a CKKS multiplication is composed of a pre-multiplication, followed by a key switching and finally by a rescaling. Let's analyze each of these operations in turn.

Pre-multiplication can be easily expressed as a sequence of arithmetic operations over $R_q$:

$$
(d_0, d_1, d_2):= (a_0 b_0, a_0b_1 + a_1b_0, a_1b_1). \tag{2}
$$

For the key switching

$$
D_0 = d_0 + \langle \mathfrak{evk}_0, CRT^{-1}_{\omega_l}(d_2) \rangle, \quad D_1 = d_1 + \langle \mathfrak{evk}_1, CRT^{-1}_{\omega_l}(d_2) \rangle, \tag{3}
$$

we come across the first obstacle. The term $$\langle \mathfrak{evk}_0$$, $$CRT^{-1}_{\omega_l}(d_2) \rangle$$ involves expressing $d_2$ with respect to the RNS basis $$\omega_l$$, which is not an arithmetic operation. Instead of proving the decomposition, we let the prover give the verifier the outcome of the decomposition. In other words, the prover sends inputs $$w_{ks, 0}, \dots, w_{ks, l} \in R_q$$ satisfying

$$
d_2 = \sum_{i=0}^l PW_{\omega_l}(1)[i] \cdot w_{ks, i} \tag{4}
$$

that is to say, they recompose to $d_2$ under the CRT map, and 

$$
\Vert w_{ks, i} \Vert < p_i, \quad i = 0, \dots l, \tag{5}
$$

which means that they are bounded by the RNS primes of the basis $\omega_l$ (remember we are at level $l$). In other words, (4) and (5) prove that the new inputs are indeed the CRT decomposition of $d_2$, and thus they can be used in (2) to compute the values $D_i$'s and continue the computation.
Next is modulus switching

$$
c_0 = (D_0 + [D_0]_{p_l})\cdot p_l^{-1}, \quad c_1 = (D_1 + [D_1]_{p_l})\cdot p_l^{-1}.
$$

Note that this is just a component-wise Euclidean division of $D_i$ by $p_l$. Using the same strategy as above, we let the prover introduce values $w_{quo, 0}, w_{quo, 1}$ and $w_{rmd, 0}, w_{rmd, 1}$ and prove that these are the quotients and remainders for the above equations. Specifically, the prover shows that

$$
D_i = p_l \cdot w_{quo, i} + w_{rmd, i}, \quad i = 0,1, \tag{6}
$$

and

$$
\Vert w_{quo, i} \Vert < q/p_l, \quad i = 0, 1, \tag{7}
$$

and

$$
\Vert w_{rmd,i} \Vert < p_l, \quad i=0,1. \tag{8}
$$

Putting (2), (3), (4) and (6) together, these are equivalent to the following arithmetic circuit satisfiability relation over $R_q$:

$$
\begin{cases}
p_l \cdot w_{quo, 0} + w_{rmd, 0} - a_0b_0 - \sum_{i=0}^l \mathfrak{evk}_0[i]\cdot w_{ks, i}\\
p_l \cdot w_{quo, 1} + w_{rmd, 1} - a_0b_1 - a_1b_0 - \sum_{i=0}^l \mathfrak{evk}_1[i]\cdot w_{ks, i}\\
d_2 - \sum_{i=0}^l PW_{\omega_l}(1)[i] \cdot w_{ks, i} = 0
\end{cases}
$$

and $l+5$ range check relations over $R_q$:

$$
\Vert w_{ks, 0} \Vert < p_0, \dots, \Vert w_{ks, l} \Vert < p_l
$$

$$
\Vert w_{rmd,0} \Vert, \Vert w_{rmd,1} \Vert  < p_l
$$

$$
\Vert w_{quo, 0} \Vert, \Vert w_{quo, 1} \Vert < q/p_l.
$$

We have shown how to arithmetize a single addition and multiplication. A similar but much more involved argument can be done for a general circuit made of CKKS additions and multiplications.
The strategy is to organize the CKKS circuit into mutiplicative layers, where consecutive additions are grouped together and are followed by the multiplication gate. Now instead of single $R_q$ values, one has to reason with $R_q$ vectors. For the details, we refer to Sec. 4 of our paper. 

### To summarize
To recap, our proof-friendly CKKS has the following properties that make it particularly suitable for proof systems:

1) A carefully designed underlying ring which gives large enough exceptional sets while keeping arithmetic fast;

2) This ring does not change during the computation, thanks to our re-design of the rescaling algorithm;

3) A scheme design for which a noise analysis proves it allows looser bounds, which in turn enables batching of range proofs.

At this point, one might ask: do these modifications have an impact on efficiency? After all, we do not change rings in our proof-friendly CKKS so, in particular, the ciphertext size does not decrease as we go through homomorphic computations. As it turns out, staying in the same ring *does not* impact the efficiency of CKKS operations! Intuitively, this is because we re-embed the ciphertexts into the initial ring $R_q$ by zero-ing the relevant slots in the RNS representation. The prover sees those zeros and simply ignores them: after all, operations involving zeros do not change the result.

We implemented and benchmarked our proof-friendly version of CKKS. We show that our proof-friendly CKKS implementation only introduces an overhead of up to 20% for ciphertext multiplications over a "regular" instantiation of the scheme, while still being faster than commonly used libraries such as HELib. This slowdown is mainly due to the use of incomplete NTT. The source code is available on [GitHub](https://github.com/vfhe/proof-friendly-CKKS).

<br />
## A first instantiation 
<div style="margin-top: 1.5em;"></div>

The framework we propose reduces the problem of proving CKKS operations to the problem of designing PIOPs for two specific relations: arithmetic circuit satisfiability over $R_q$ and range checks for $R_q$ vectors. This problem can now be solved with the use of black-box components, making our solution highly modular. In the paper, we make some specific choices for providing a first instantiation that could concretely demonstrate practical feasibility. By themselves, some of these components are also independent contributions, as we designed them to exploit the particular characteristics of our arithmetic structures. Ultimately, however, one could pick and choose different instantiations, and in doing so, optimise for different efficiency metrics.

Our instantiation of the framework consists of the following components:

- Arithmetic circuit relations are proven with a "custom" version of the GKR protocol [2] over rings. This variant crucially takes advantage of the particular structure of the circuit induced by our previous arithmetization, which results in a GKR circuit of constant depth (consisting of only $4$ layers), independent of the size or depth of the HE circuit.
- Range checks are proven using lookup arguments, i.e., a proof that convinces the verifier that a value belongs to a table of values $T_B$. For example, this table may include values within a certain range $B$. However, since CKKS requires to check large bounds (e.g., $B$ can have between $50$ and $300$ bits, depending on the level), and the ring dimension is concretely large (typically $$N \in \{2^{13}, 2^{17}\}$$) the public table $T_B$ would be too large to even represent. To overcome this issue, we rely on the recent decomposition technique of Lasso [5], that consists in splitting a large table into smaller ones, so that one can efficiently perform look-ups into them.
- The last component for building a succinct argument is a polynomial commitment for *multilinear* polynomials over $R_q$, since those are used to encode the messages sent by the prover in our PIOPs. First, we use the splitting (1) of $R_q$ into the product of finite fields to reduce the problem of designing a PC for multilinear polynomials over $R_q$ into that of designing PCs for multilinear polynomials over finite fields. The second contribution here is to use a field-agnostic PC, Brakedown [3], and modify it in such a way that we can use the limited algebraic structure of our fields to gain in efficiency.

<br />
## Future work
<div style="margin-top: 1.5em;"></div>

The relevance of our framework is mainly on the abstraction level. We are able to provide a blueprint for constructing vHE schemes where verification is asymptotically fast and the prover can potentially scale up well with the size of the circuit. Our blueprint is realized in a modular way by combining specific building blocks. We instantiate these by modifying and optimizing recent constructions from proof systems literature. We demonstrate that our building blocks can be practically instantiated. Compared to previous literature, our results for small (depth-1) circuits indicate similar performance levels as [4], which was the state of the art on concrete performance for verifiable RNS HE schemes. However, contrary to [4], we verify full-featured RNS-based leveled HE schemes, including key switching and rescaling operations, which enables our solution to scale to larger circuits. In contrast, the performance in the previous approach [4] would deteriorate exponentially with the circuit depth. 

The interested reader can also check online the recordings of our talks: 
- For an FHE introduction check the [talk at FHE.org](https://www.youtube.com/watch?v=nAdAs56TxvE)
- For a more SNARK-y perspective check the [talk at ZKProof](https://www.youtube.com/watch?v=QskB0USXFrU)

The next challenge is of course practical: to show that our framework is really able to scale up with large circuits. So stay tuned!

---

<br />
## References
<div style="margin-top: 1.5em;"></div>

[1] I. Cascudo, A. Costache, D. Cozzo, D. Fiore, A. Guimaraes and E. Soria-Vazquez. "Verifiable Computation for Approximate Homomorphic Encryption Schemes." CRYPTO 2025.

[2] S. Goldwasser, Y. T. Kalai, and G. N. Rothblum. "Delegating Computation: Interactive Proofs for Muggles." Journal of the ACM 2015.

[3] A. Golovnev, J. Lee, S. T. V. Setty, J. Thaler, and R. S. Wahby. "Brakedown: Linear-time and Field-agnostic SNARKs for R1CS." CRYPTO 2023.

[4] C. Knabenhans, A. Viand, and A. Hithnawi. "Towards Robust FHE for the Real World." Real World Crypto 2024.

[5] S. T. V. Setty, J. Thaler, and R. S. Wahby. "Unlocking the Lookup Singularity with Lasso." EUROCRYPT 2024.
