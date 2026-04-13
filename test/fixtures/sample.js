function greet(name) {
  return 'Hello, ' + name + '!';
}

var colors = ['red', 'green', 'blue'];

for (var i = 0; i < colors.length; i++) {
  console.log(greet(colors[i]));
}
