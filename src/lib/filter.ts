// 기본적인 한글 욕설 및 비방 단어 리스트
// (선거 캠프 특성상 정치적 비하 단어나 일반적인 욕설을 포함할 수 있습니다)
const badWords = [
  "씨발", "시발", "씨바", "시바", "씨빨", "개새끼", "개새", "개색", "새끼", "새기",
  "병신", "븅신", "빙신", "미친", "미친놈", "미친년", "좆", "좃", "존나", "졸라",
  "썅", "쌍년", "쌍놈", "지랄", "염병", "창녀", "애미", "애비", "니기미", "호로",
  "쓰레기", "꺼져", "닥쳐", "뒈져", "뒤져", "죽어"
];

export function containsProfanity(text: string): boolean {
  // 공백을 제거한 텍스트도 검사하여 "시 발" 같이 띄어쓰기로 피하는 것을 일부 방지
  const noSpaceText = text.replace(/\s+/g, "");
  
  for (const word of badWords) {
    if (text.includes(word) || noSpaceText.includes(word)) {
      return true;
    }
  }
  
  return false;
}
