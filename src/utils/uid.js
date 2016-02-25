export default function (len) {
    var idLength = Math.pow(10,(len || 6));
    return Math.random() * idLength;
}
