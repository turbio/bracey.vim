left = [
	1,2,3,4
];
right = [
	1,2,3,4
];

diff = [];

function addDiff(action, index, arg){
	newAction = {
		'action': action,
		'index': index,
	}
	switch(action){
		case 'add':
			newAction['value'] = arg;
			left.splice(index, 0, arg)

			console.log('    ' + left);
			console.log('    ' + Array(index + 1).join('  ') + '^add');
			break;
		case 'remove':
			console.log('    ' + left);
			console.log('    ' + Array(index + 1).join('  ') + '^remove');

			left.splice(index, 1)
			break;
		case 'move':
			console.log('    ' + left);
			console.log('    ' + Array(index + 1).join('  ') + '^move');

			newAction['to'] = arg;
			var temp = left[index];
			left.splice(index, 1)
			left.splice(arg, 0, temp)

			console.log('    ' + left);
			console.log('    ' + Array(arg + 1).join('  ') + '^to');
			break;
	}

	diff.push(newAction);
}

for(var i = 0; i < Math.max(left.length, right.length); i++){
	console.log('iteration: ' + i);
	console.log('    ' + left);
	console.log('    ' + Array(i + 1).join('  ') + '↓');
	console.log('    ' + right);
	if(left[i] == right[i]){
		console.log('    ' + left[i] + ' = ' + right[i]);
		continue;
	}

	console.log('    ' + left[i] + ' ≠ ' + right[i]);

	//then there's probably a new item at the end of left
	if(left[i] == undefined){
		console.log('    left lacks');
		addDiff('add', i, right[i]);
	}else if(right[i] == undefined){
		console.log('    right lacks');
		addDiff('remove', i);
	}else{
		//try to find left value in right
		for(var j = i; j < left.length; j++){
			if(left[j] == right[i]){
				console.log('    different indexes');
				addDiff('move', j, i);
				break;
			}else if(j == left.length - 1){
				console.log('    left not in right');
				addDiff('remove', i);
				if(left[i] != right[i]){
					addDiff('add', i, right[i]);
				}
				break;
			}
		}
	}
}

console.log(diff);
