const getExchangeRateUsdToTry = async () => {
  return await fetch("https://raw.githubusercontent.com/TheArmagan/currency/main/api/USD-to-TRY.json", {
    cache: 'no-store'
  }).then(res => res.json()).then(res => Math.round(res.value * 100) / 100);
}

module.exports = getExchangeRateUsdToTry;