在**总长固定**且每段有**上下界约束**下，使 `a_i` 与目标 `b_i` 的整体误差最小。用最常见的“平方误差和” `∑(a_i - b_i)²` 作为拟合度指标。

---

## 数学模型

- **已知**：总长度 `L`，分段数 `n`，每段目标值 `b_i`，允许范围 `[min_i, max_i]`。
- **求**：`a_i` 满足  
  ```
  min  ∑(a_i - b_i)²
  s.t. ∑ a_i = L
       min_i ≤ a_i ≤ max_i,  i = 1..n
  ```

这是一个**带等式约束和箱型约束的凸二次规划**。

---

## 最优解的结构（KKT 条件）

利用拉格朗日乘子法（先忽略边界），最优解满足：
```
a_i = b_i - λ    （λ 是总长约束的乘子）
```
再把它“夹”回允许区间内：
```
a_i(λ) = clip(b_i - λ, min_i, max_i)
       = max( min_i, min( max_i, b_i - λ ) )
```
总长度是 λ 的**单调不增函数**：
```
S(λ) = ∑ a_i(λ)
```
只需找到 λ* 使 `S(λ*) = L`，此时的 `a_i(λ*)` 就是全局最优解。

---

## 解法：二分法求 λ

### 步骤
1. **确定 λ 的搜索范围**  
   令 `λ_min = min_i (b_i - max_i)`，`λ_max = max_i (b_i - min_i)`。  
   当 λ 很小时，`a_i` 贴近 `max_i`，总长最大；λ 很大时，`a_i` 贴近 `min_i`，总长最小。

2. **检查可行性**  
   计算 `S(λ_min)` 和 `S(λ_max)`。若 `L` 不在两者之间，则问题无解（总长 L 不可能落在各段上下界之和范围内）。

3. **二分搜索**  
   精度设为 ε（如 1e-8）。当 `λ_max - λ_min > ε` 时：  
   - 取中点 `λ_mid = (λ_min + λ_max) / 2`  
   - 计算 `S(λ_mid)`  
   - 若 `S(λ_mid) > L`，说明当前总长偏大，需要增大 λ（让各段减得更多），令 `λ_min = λ_mid`；  
   - 否则令 `λ_max = λ_mid`。

4. **得到结果**  
   用最终的 λ 计算 `a_i = clip(b_i - λ, min_i, max_i)`。

### 伪代码
```python
def solve(L, b, mins, maxs):
    lambda_min = min(b_i - max_i for all i)
    lambda_max = max(b_i - min_i for all i)
    S = lambda lam: sum(max(mins[i], min(maxs[i], b[i] - lam)) for i in range(n))

    if L < S(lambda_max) or L > S(lambda_min):
        return "无解，总长L无法在边界内实现"

    for _ in range(80):          # 80次迭代足够高精度
        lam_mid = (lambda_min + lambda_max) / 2
        if S(lam_mid) > L:
            lambda_min = lam_mid
        else:
            lambda_max = lam_mid

    lam_opt = (lambda_min + lambda_max) / 2
    a = [max(mins[i], min(maxs[i], b[i] - lam_opt)) for i in range(n)]
    return a, lam_opt
```

---

## 直观解释
你可以把 λ 想象成“统一水位”：  
- 从目标值 `b_i` 减去 λ，得到理想点；  
- 再把它限制在 `[min_i, max_i]` 的“槽”内；  
- 总长度不足就减小 λ（抬高所有段），总长度过多就增大 λ（压低所有段）。

这和“有边界限制的等边际调整”问题完全一致。
