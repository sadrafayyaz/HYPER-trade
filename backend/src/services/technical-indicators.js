function sanitizeValues(
  values
) {
  return (
    Array.isArray(values)
      ? values
      : []
  )
    .map(Number)
    .filter((value) =>
      Number.isFinite(
        value
      )
    );
}

function average(values) {
  const clean =
    sanitizeValues(values);

  if (!clean.length) {
    return 0;
  }

  return (
    clean.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / clean.length
  );
}

function sma(
  values,
  period
) {
  const clean =
    sanitizeValues(values);

  const safePeriod =
    Math.max(
      Number(period) || 1,
      1
    );

  if (!clean.length) {
    return 0;
  }

  return average(
    clean.slice(
      -safePeriod
    )
  );
}

function ema(
  values,
  period
) {
  const clean =
    sanitizeValues(values);

  const safePeriod =
    Math.max(
      Number(period) || 1,
      1
    );

  if (!clean.length) {
    return 0;
  }

  if (
    clean.length <=
    safePeriod
  ) {
    return average(clean);
  }

  const multiplier =
    2 /
    (safePeriod + 1);

  let result =
    average(
      clean.slice(
        0,
        safePeriod
      )
    );

  for (
    let index =
      safePeriod;
    index < clean.length;
    index += 1
  ) {
    result =
      (clean[index] -
        result) *
        multiplier +
      result;
  }

  return result;
}

function rsi(
  values,
  period = 14
) {
  const clean =
    sanitizeValues(values);

  const safePeriod =
    Math.max(
      Number(period) || 14,
      2
    );

  if (
    clean.length < 2
  ) {
    return 50;
  }

  const changes = [];

  for (
    let index = 1;
    index < clean.length;
    index += 1
  ) {
    changes.push(
      clean[index] -
        clean[index - 1]
    );
  }

  const recent =
    changes.slice(
      -safePeriod
    );

  let gain = 0;
  let loss = 0;

  for (
    const change of recent
  ) {
    if (change >= 0) {
      gain += change;
    } else {
      loss += Math.abs(
        change
      );
    }
  }

  if (loss === 0) {
    return gain > 0
      ? 100
      : 50;
  }

  const relativeStrength =
    gain / loss;

  return (
    100 -
    100 /
      (1 +
        relativeStrength)
  );
}

function macd(
  values,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) {
  const clean =
    sanitizeValues(values);

  if (
    clean.length < 3
  ) {
    return {
      macd: 0,
      signal: 0,
      histogram: 0,
    };
  }

  const series = [];

  for (
    let index = 0;
    index < clean.length;
    index += 1
  ) {
    const partial =
      clean.slice(
        0,
        index + 1
      );

    const fast =
      ema(
        partial,
        fastPeriod
      );

    const slow =
      ema(
        partial,
        slowPeriod
      );

    series.push(
      fast - slow
    );
  }

  const currentMacd =
    series.at(-1) || 0;

  const signal =
    ema(
      series,
      signalPeriod
    );

  return {
    macd: currentMacd,
    signal,
    histogram:
      currentMacd -
      signal,
  };
}

function trueRange(
  candle,
  previousCandle = null
) {
  const high =
    Number(candle?.high);

  const low =
    Number(candle?.low);

  const previousClose =
    Number(
      previousCandle?.close
    );

  if (
    !Number.isFinite(
      high
    ) ||
    !Number.isFinite(
      low
    )
  ) {
    return 0;
  }

  if (
    !Number.isFinite(
      previousClose
    )
  ) {
    return Math.max(
      high - low,
      0
    );
  }

  return Math.max(
    high - low,
    Math.abs(
      high -
        previousClose
    ),
    Math.abs(
      low -
        previousClose
    )
  );
}

function atr(
  candles,
  period = 14
) {
  if (
    !Array.isArray(
      candles
    ) ||
    !candles.length
  ) {
    return 0;
  }

  const ranges = [];

  for (
    let index = 0;
    index < candles.length;
    index += 1
  ) {
    ranges.push(
      trueRange(
        candles[index],
        candles[
          index - 1
        ] || null
      )
    );
  }

  return average(
    ranges.slice(
      -Math.max(
        Number(period) ||
          14,
        1
      )
    )
  );
}

function standardDeviation(
  values
) {
  const clean =
    sanitizeValues(values);

  if (
    clean.length < 2
  ) {
    return 0;
  }

  const mean =
    average(clean);

  const variance =
    average(
      clean.map(
        (value) =>
          (value - mean) **
          2
      )
    );

  return Math.sqrt(
    variance
  );
}

function percentChange(
  values
) {
  const clean =
    sanitizeValues(values);

  if (
    clean.length < 2 ||
    clean[0] === 0
  ) {
    return 0;
  }

  return (
    ((clean.at(-1) -
      clean[0]) /
      clean[0]) *
    100
  );
}

function volatilityPercent(
  values
) {
  const clean =
    sanitizeValues(values);

  if (
    clean.length < 2
  ) {
    return 0;
  }

  const returns = [];

  for (
    let index = 1;
    index < clean.length;
    index += 1
  ) {
    if (
      clean[index - 1] ===
      0
    ) {
      continue;
    }

    returns.push(
      (clean[index] -
        clean[index - 1]) /
        clean[index - 1]
    );
  }

  return (
    standardDeviation(
      returns
    ) * 100
  );
}

module.exports = {
  average,
  sma,
  ema,
  rsi,
  macd,
  atr,
  standardDeviation,
  percentChange,
  volatilityPercent,
};