import Script from 'next/script'

const UmamiAnalytics = () => {
  return (
    <>
    <Script
      src='https://umami.sao-x.com/script.js'
      data-website-id='4253ebc1-faea-4497-9376-bd2263a78bb9'
    />
        <Script
      src='https://umami.sao-x.com/recorder.js'
      data-website-id='4253ebc1-faea-4497-9376-bd2263a78bb9'
    />
</>
  )
}
export default UmamiAnalytics
