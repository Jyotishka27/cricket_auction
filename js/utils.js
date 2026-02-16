function fmt(num) {
  return new Intl.NumberFormat('en-IN').format(num);
}

function catLabel(cat) {
  return CATEGORY_LABELS[cat] || 'Unknown';
}

function applyUnsoldReduction(player) {
  player.unsoldCount = (player.unsoldCount || 0) + 1;
  player.basePrice = Math.max(
    Math.floor(player.basePrice * REDUCTION_FACTOR),
    MIN_PRICE
  );
}
