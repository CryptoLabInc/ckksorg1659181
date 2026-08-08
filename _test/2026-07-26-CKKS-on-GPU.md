---
layout: post
title: >
  Accelerating CKKS on GPUs with Cheddar and Theodosian
date: 2026-07-26 00:00:00-0000
description: >
  TL;DR: Modern GPUs provide enormous parallel computation capability, making them an attractive platform for accelerating CKKS. However, achieving high performance requires redesigning both the cryptographic algorithms and the GPU implementation together rather than simply porting CPU code. In this post, I introduce Cheddar, a GPU-native CKKS library based on a 32-bit RNS construction that achieves state-of-the-art performance, and Theodosian, which shows that modern GPU implementations are no longer compute-bound but instead limited by on-chip L2 cache bandwidth. Together, these works illustrate both how far GPU acceleration has come and where the next performance barriers lie.
author: Jongmin Kim
tags: 
categories: 
related_posts: false
toc:
  sidebar: right
giscus_comments: true
---

* Written by [Jongmin Kim](https://scholar.google.com/citations?user=vnnXMLQAAAAJ) (Seoul National University)
* Based on [Cheddar](https://doi.org/10.1145/3760250.3762223) (ASPLOS 2026) and [Theodosian](https://doi.org/10.1109/ISPASS69572.2026.00037) (ISPASS 2026)

*TL;DR: Modern GPUs provide enormous parallel computation capability, making them an attractive platform for accelerating CKKS. However, achieving high performance requires redesigning both the cryptographic algorithms and the GPU implementation together rather than simply porting CPU code. In this post, I introduce Cheddar, a GPU-native CKKS library based on a 32-bit RNS construction that achieves state-of-the-art performance, and Theodosian, which shows that modern GPU implementations are no longer compute-bound but instead limited by on-chip L2 cache bandwidth. Together, these works illustrate both how far GPU acceleration has come and where the next performance barriers lie.*


## Introduction

GPUs are promising hardware platforms for accelerating CKKS because they can execute thousands of parallel operations simultaneously. Based on our profiling, NVIDIA's recent consumer GPU, the RTX 5090, can perform up to 14.95 trillion 32-bit integer multiply-and-add (IMAD) operations per second. Fully exploiting this computational throughput can dramatically reduce CKKS execution time compared to CPU-based FHE libraries such as SEAL, HElib, and OpenFHE. Indeed, numerous prior studies, such as Jung et al. [1], have explored GPU acceleration for FHE, reporting over 100$\times$ lower CKKS bootstrapping latency compared to previous CPU implementations.

Despite this progress, existing GPU libraries still leave considerable performance on the table because they do not co-optimize CKKS for GPUs at both the algorithmic level (word size, RNS representation, and key structure) and the microarchitectural level (L2 cache hierarchy, memory bandwidth, and warp scheduling). Simply adapting CPU-oriented 64-bit arithmetic to GPUs is not enough; we instead need to design the software stack around the GPU's native execution units.

To bridge this performance gap, our research group at Seoul National University (led by Prof. Jung Ho Ahn) recently presented two works:

1. **Cheddar** introduces a systematic 32-bit RNS framework designed natively around GPU hardware primitives. We open-sourced Cheddar at [https://github.com/scale-snu/cheddar-fhe](https://github.com/scale-snu/cheddar-fhe).
2. **Theodosian** builds on Cheddar with a detailed microarchitectural study of GPU memory systems. It shows that once the compute bottlenecks are removed, execution encounters an "inner memory wall" at the on-chip L2 cache, and proposes memory-aware optimizations to overcome it.

## GPU-friendly 32-bit RNS

Conventional CPU-based HE libraries use RNS primes as large as $2^{62}$, matching 64-bit CPU registers and SIMD extensions. GPUs, however, are optimized for 32-bit integer (INT32) execution, while 64-bit integer (INT64) arithmetic is implemented through software emulation using multiple INT32 operations. By choosing RNS primes that fit within INT32, HE computations can directly utilize the GPU's native integer units, significantly improving throughput and efficiency.

The tradeoff is that smaller RNS primes increase the number of RNS primes, $L$. With RNS, a polynomial is decomposed into $L$ *limbs*, where each limb contains $N$ (polynomial degree determined as a CKKS parameter) INT32 or INT64 coefficients. Decomposing the same modulus into INT32 RNS primes will roughly double $L$. Consequently, operations with $\mathcal{O}(L)$ complexity may nearly double, while those with $\mathcal{O}(L^2)$ complexity can increase by up to four times. Despite this overhead, the lower cost of native INT32 arithmetic—often less than half that of emulated INT64 operations—largely compensates for the increase. Furthermore, the larger number of data elements exposes additional parallelism, allowing work to be distributed across more GPU streaming multiprocessors (SMs) and ultimately yielding higher overall throughput.

Previous CKKS.org blog posts already discussed a similar issue and introduced several approaches for constructing RNS using smaller word sizes such as INT32: [Modern Construction of Moduli Chain in HEaaN2](https://ckks.org/blog/2026/heaan2-moduli-chain/) and [Grafting: Improving Performance and Usability of Homomorphic Encryption](https://ckks.org/blog/2025/grafting/). Here, I focus only on Cheddar's **25-30 prime system**, which is specifically designed for GPU execution.

The 25-30 prime system constructs the RNS using only primes close to $2^{25}$ (*Pr~25*) and $2^{30}$ (*Pr~30*). It supports only scales ($\Delta$) that are powers of $2^5$, such as $2^{30}$, $2^{35}$, $2^{40}$, and $2^{45}$. In practice, this restriction is rarely limiting; supporting every possible scale value is unnecessary for most CKKS applications.

In this system, we attempt to find a *cycle*. For example, when $\Delta = 2^{40}$, we can rescale a polynomial in either of the following two ways:

<ul style="list-style-type: '① ';">
  <li>Add two new <i>Pr~25</i> (inverse rescaling, which multiplies the polynomial by these two primes), then discard three <i>Pr~30</i> (ordinary rescaling). The resulting scale adjustment is 25 + 25 - 30 - 30 - 30 = -40 bits.</li>
</ul>
<ul style="list-style-type: '② ';">
  <li>Add two new <i>Pr~30</i> primes and discard four <i>Pr~25</i> primes. The resulting scale adjustment is 30 + 30 - 25 - 25 - 25 - 25 = -40 bits.</li>
</ul>

We then mix the use of these two methods in a cyclical manner with the number of *Pr~25* evolving as

$$0 \xrightarrow{①} 2 \xrightarrow{①} 4 \xrightarrow{②} 0 \xrightarrow{①} 2 \xrightarrow{①} 4 \xrightarrow{②} \cdots,$$

while always reusing the same four *Pr~25* in a predetermined order. The resulting RNS construction is illustrated below:

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2608_Jongmin/prime_system.svg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 1. 25-30 Prime System.
</div>
<!-- ![25-30 prime system](assets/img/blog/2608_Jongmin/prime_system.svg) -->

The motivation for this construction is to limit the number of *Pr~25* used, which correspond to the terminal primes introduced in BitPacker [2]. In BitPacker, terminal primes are selected greedily at each level, causing different levels to use largely different sets of primes. This becomes problematic when data structures such as evaluation keys must be shared across multiple levels.

In contrast, the 25-30 prime system ensures that every level draws its *Pr~25* from the same small, fixed set. As a result, we can simply precompute and share the required data (e.g., evaluation keys) for every prime in the set, which is practical because the set is small. Despite this additional restriction, we observe almost no scale fluctuation in practice: when the target scale is $2^{40}$, the actual scale remains between $2^{39.9}$ and $2^{40.1}$ throughout execution.

There are additional details regarding the levels dedicated to CKKS bootstrapping, which are discussed in the Cheddar paper.

### Inverted-Terminal Data Layout

Because we use the primes in a fixed order, the set of primes used at a level would be

$$\{ \mathcal{T}_0, \mathcal{T}_1, \cdots, \mathcal{T}_{A-1}, \mathcal{Q}_0, \mathcal{Q}_1, \cdots, \mathcal{Q}_{B-1} \}$$

where $A$ is the number of *Pr~25* ($\mathcal{T}_i$) and $B$ is the number of *Pr~30* ($\mathcal{Q}_i$). A polynomial at this level therefore contains $A+B$ limbs.

To simplify indexing while keeping the data contiguous, we store the limbs in the following order, with the terminal primes reversed:

$$\mathcal{T}_{A-1}, \mathcal{T}_{A-2}, \cdots, \mathcal{T}_{0}, \mathcal{Q}_0, \mathcal{Q}_1, \cdots, \mathcal{Q}_{B-1}.$$

Suppose the limb corresponding to $\mathcal{Q}_0$ is assigned index 0. Then negative indices naturally refer to the terminal *Pr~25*, while non-negative indices refer to the main *Pr~30*. This inverted-terminal layout simplifies index computation and enables straightforward parallelization across the thousands of execution units available on modern GPUs.

## Cheddar GPU Library

Along with the 25-30 prime system, Cheddar incorporates several GPU-specific optimizations:

* **Optimized INT32 kernels:** Core primitives such as the number-theoretic transform (NTT) and base conversion (BConv) are implemented using optimized INT32 arithmetic. In particular, Cheddar employs a signed Montgomery reduction that minimizes the number of integer instructions.
* **Extensive kernel fusion:** Computational sequences are fused and reordered to avoid unnecessarily writing intermediate polynomial limbs back to global memory.

Beyond these optimizations, Cheddar is a full-fledged CKKS library supporting the complete evaluation pipeline, from basic arithmetic to bootstrapping. The example below demonstrates how a CKKS computation can be implemented with only a few API calls.

```C++
using word = uint32_t;
Ciphertext<word> tmp;

// tmp = (ct1 - ct2) * ct3;
context->Sub(tmp, ct1, ct2);
context->Mult(tmp, tmp, ct3);
context->Relinearize(tmp, tmp, interface->GetMultiplicationKey());

// perform bootstrapping
context->Boot(tmp, tmp, interface->GetEvkMap());
```

Cheddar is open-sourced under the MIT license and is available at [https://github.com/scale-snu/cheddar-fhe](https://github.com/scale-snu/cheddar-fhe).

### Cheddar Performance

The following table compares Cheddar against Jung et al. [1], TensorFHE [3], HEaaN-GPU [4], and WarpDrive [5].

<!--
| Implementation (Hardware) | Boot (ms) | HELR (ms/it) | ResNet-20 (s) |
| :--- | :---: | :---: | :---: |
| Jung et al. (V100) | 328 | 775 | - |
| TensorFHE (A100 40GB) | 250 | 1007 | 4.94 |
| HEaaN-GPU (A100 80GB) | 171 | - | 8.58 |
| WarpDrive (A100 80GB) | 121 | 113 | 5.88 |
| **Cheddar (A100 80GB)** | 40.0 | 51.9 | 1.32 |
| **Cheddar (H100)** | 31.2 | 40.7 | 1.05 |
| **Cheddar (RTX 5090)** | 22.1 | 25.9 | 0.72 |
-->

<div style="overflow-x: auto; margin-bottom: 1.0em;">
<table style="border-collapse: collapse; border: 1px solid; min-width: 100%;">
  <thead>
    <tr style="border-bottom: 2px solid ">
      <th style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Implementation (Hardware)</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">Boot (ms)</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">HELR (ms/it)</th>
      <th style="border: 1px solid; padding: 6px 12px; text-align: center;">ResNet-20 (s)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Jung et al. (V100)</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">328</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">775</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">-</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">TensorFHE (A100 40GB)</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">250</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">1007</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">4.94</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">HEaaN-GPU (A100 80GB)</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">171</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">-</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">8.58</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">WarpDrive (A100 80GB)</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">121</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">113</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">5.88</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>Cheddar (A100 80GB)</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>40.0</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>51.9</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>1.32</strong></td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>Cheddar (H100)</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>31.2</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>40.7</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>1.05</strong></td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>Cheddar (RTX 5090)</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>22.1</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>25.9</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>0.72</strong></td>
    </tr>
  </tbody>
</table>
</div>

<div class="caption">
    Table 1. Cheddar performance compared with prior GPU implementations.
</div>

Compared to WarpDrive, the previous state of the art, Cheddar achieves 2.18–4.45$\times$ faster execution on the same NVIDIA A100 80GB GPU. On an RTX 5090, a ResNet-20 inference completes in just 0.72 seconds, which is more than 3,000$\times$ faster than the original CPU implementation by Lee et al. [6].

## Theodosian: We're Approaching a Performance Limit

Having achieved highly competitive performance with Cheddar, we wanted to understand what ultimately limits further speedups. We therefore profiled Cheddar in detail with a particular focus on the GPU memory hierarchy.

Prior work largely assumed that off-chip DRAM bandwidth was the primary bottleneck. However, our microarchitectural analysis in **Theodosian** reveals that on modern high-end GPUs such as the RTX 5090, highly optimized 32-bit kernels instead become limited by the on-chip L2 cache bandwidth—the "inner memory wall."

Even Cheddar's most compute-intensive kernels, such as NTT and BConv, become L2-bandwidth bound after optimization. This indicates that nearly all GPU kernels are ultimately constrained by memory bandwidth (either L2 cache or DRAM) rather than raw computational throughput.

Based on the total amount of L2 traffic required for CKKS bootstrapping, we estimate an **absolute latency wall of 8.8ms** on the RTX 5090. Cheddar's measured latency of 22.1ms is therefore already within only 2.5$\times$ of this architectural limit.

### Optimizations in Theodosian

Based on this analysis, Theodosian introduces several microarchitecture-aware optimizations:

* **L2-aware multi-polynomial batching:** Batch multiple polynomials together to improve L2 cache utilization while keeping the working set small enough to avoid spilling into DRAM.
* **Resource co-scheduling:** Execute L2-bound and DRAM-bound kernels together so they utilize complementary hardware resources and hide each other's latency.
* **CUDA graphs:** Reduce the overhead of increasingly complex execution schedules and kernel launches.

Theodosian also includes additional kernel-level optimizations and further kernel fusion, which are described in detail in the paper.

### Theodosian Performance

<!--
| Implementation | Boot (ms) | HELR (ms/it) | ResNet-20 (s) |
| :--- | :---: | :---: | :---: |
| FIDESlib [7] | 147 | - | - |
| Cheddar | 22.1 | 25.9 | 0.720 |
| Theodosian | 15.2 | 14.1 | 0.467 |
-->

<div style="overflow-x: auto; margin-bottom: 1.0em;">
<table style="border-collapse: collapse; border: 1px solid; min-width: 100%;">
  <thead>
    <tr style="border-bottom: 2px solid ">
      <th style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Implementation</th>
      <th style="border: 1px solid; padding: 6px 12px;">Boot (ms)</th>
      <th style="border: 1px solid; padding: 6px 12px;">HELR (ms/it)</th>
      <th style="border: 1px solid; padding: 6px 12px;">ResNet-20 (s)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">FIDESlib [7]</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">147</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">-</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">-</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Cheddar</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">22.1</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">25.9</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">0.720</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>Theodosian</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>15.2</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>14.1</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;"><strong>0.467</strong></td>
    </tr>
  </tbody>
</table>
</div>

<div class="caption">
    Table 2. Theodosian performance on the RTX 5090. 
</div>

Thanks to these optimizations, Theodosian achieves an additional 1.45–1.83$\times$ speedup over Cheddar on the RTX 5090. Notably, Theodosian is less than 2$\times$ away from the aforementioned absolute latency wall of 8.8ms, suggesting that relatively little performance remains to be gained through GPU optimization alone. 


<div style="overflow-x: auto; margin-bottom: 1.0em;">
<table style="border-collapse: collapse; border: 1px solid; min-width: 100%;">
  <thead>
    <tr style="border-bottom: 2px solid ">
      <th style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Implementation</th>
      <th style="border: 1px solid; padding: 6px 12px;">log N</th>
      <th style="border: 1px solid; padding: 6px 12px;">log PQ</th>
      <th style="border: 1px solid; padding: 6px 12px;">log Q after boot</th>
      <th style="border: 1px solid; padding: 6px 12px;">Boot precision</th>
      <th style="border: 1px solid; padding: 6px 12px;">Boot latency</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Cheddar</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">16</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">1711</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">575</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">18.57 bits</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">16.21ms</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;">Theodosian</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">16</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">1711</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">575</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">18.57 bits</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">23.18ms</td>
    </tr>
    <tr>
      <td style="border: 1px solid; padding: 6px 12px; min-width: 80px;"><strong>Theodosian (with CKKS bootstrapping algorithm enhancements)</strong></td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">16</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">1711</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">575</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">18.70 bits</td>
      <td style="border: 1px solid; padding: 6px 12px; text-align: center;">12.75ms</td>
    </tr>
  </tbody>
</table>
</div>

<div class="caption">
    Table 3. Comparing bootstrapping performance of Cheddar and Theodosian without or with additional algorithmic enhancements.
</div>


Algorithmic advances can still push this limit further, however. For example, by incorporating several recent CKKS bootstrapping improvements, we further reduced the bootstrapping latency to 12.75ms while maintaining similar precision and modulus budget after bootstrapping.

## Historical Trend and Future Work

<div class="row mt-3">
    <div class="col-sm-12 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2608_Jongmin/historic_trend.svg" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 2. Historical Trend. 
</div>
<!-- ![historic trend](./assets/img/blog/2608_Jongmin/historic_trend.svg) -->

The figure above summarizes an interesting trend. FHE performance has steadily improved over time, but the rate of improvement is clearly slowing.

Until around 2021, rapid progress of roughly 7.9$\times$ per year was sustained, driven by both algorithmic advances and the first large-scale use of GPUs for FHE by Jung et al. [1]. Since then, however, improvements have slowed to roughly 1.8$\times$ per year. This trend is not unique to GPUs: recent FPGA, TPU, and multi-GPU implementations all report similar performance levels, with no leap in performance attributable solely to hardware acceleration.

This suggests that future breakthroughs are unlikely to come from hardware acceleration alone. Instead, continued progress will require cryptographic algorithms and hardware architectures to be designed together—the central theme behind both Cheddar and Theodosian.

An even more ambitious question is whether we can build hardware specifically for FHE, with substantially higher computational throughput and memory bandwidth than today's GPUs. If so, the architectural performance wall itself could be pushed much further away. That question remains open.

## References

[1] Wonkyung Jung, Sangpyo Kim, Jung Ho Ahn, Jung Hee Cheon, and Younho Lee, "Over 100x Faster Bootstrapping in Fully Homomorphic Encryption through Memory-centric Optimization with GPUs." IACR CHES 2021.  

[2] Nikola Samardzic and Daniel Sanchez, "BitPacker: Enabling High Arithmetic Efficiency in Fully Homomorphic Encryption Accelerators." ASPLOS 2024.  

[3] Shengyu Fan, Zhiwei Wang, Weizhi Xu, Rui Hou, Dan Meng, and Mingzhe Zhang, "TensorFHE: Achieving Practical Computation on Encrypted Data Using GPGPU." IEEE HPCA 2023.  

[4] Jaiyoung Park, Donghwan Kim, Jongmin Kim, Sangpyo Kim, Wonkyung Jung, Jung Hee Cheon, and Jung Ho Ahn, "Toward Practical Privacy-Preserving Convolutional Neural Networks Exploiting Fully Homomorphic Encryption." DISCC 2023.  

[5] Guang Fan, Mingzhe Zhang, Fangyu Zheng, Shengyu Fan, Tian Zhou, Xianglong Deng, Wenxu Tang, Liang Kong, Yixuan Song, and Shoumeng Yan, "WarpDrive: GPU-Based Fully Homomorphic Encryption Acceleration Leveraging Tensor and CUDA Cores." IEEE HPCA 2025.  

[6] Eunsang Lee, Joon-Woo Lee, Junghyun Lee, Young-Sik Kim, Yongjune Kim, Jong-Seon No, and Woosuk Choi, "Low-Complexity Deep Convolutional Neural Networks on Fully Homomorphic Encryption Using Multiplexed Parallel Convolutions." ICML 2022.

[7] Carlos Agulló-Domingo, Óscar Vera-López, Seyda Guzelhan, Lohit Daksha, Aymane El Jerari, and Kaustubh Shivdikar, "FIDESlib: A Fully-Fledged Open-Source FHE Library for Efficient CKKS on GPUs." IEEE ISPASS 2025.