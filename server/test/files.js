var expect = require('chai').expect;

describe('filemanager', function(){
	var filemanager, files;

	before(function(){
		filemanager = require('../filemanager.js');
	});

	beforeEach(function(){
		files = new filemanager();
	});

	describe('constructor', function(){
		it('should not throw', function(){
			var f = new filemanager();
		});
		it('should call callback when current html file changes', function(done){
			var calls = [
				function(file){
					expect(file.name).to.equal('changed_to');
					done();
				},
				function(file){
					expect(file.name).to.equal('changed_from');
				}
			];

			var f = new filemanager(function(file){
				calls.pop()(file);
			});

			f.newFile(0, 'changed_from', '', 'html', '');
			f.newFile(1, 'ignored_file', '', 'css', '');
			f.newFile(2, 'changed_to', '', 'html', '');

			f.setCurrentFile(0);
			f.setCurrentFile(1);
			f.setCurrentFile(2);
		});
	});

	describe('#newFile()', function(){
		it('should not add a file to the list given an empty file', function(){
			files.newFile();
			files.files.should.be.empty;
		});

		it('should add file with no contents', function(){
			files.newFile(0, 'test', '/test/', 'html', '');
			expect(files.getById(0)).to.be.ok;
			expect(files.getById(0).name).to.equal('test');
		});
	});

	describe('#getCurrentFile()', function(){
		it('should return null by default', function(){
			expect(files.getCurrentFile()).to.not.be.ok;
			files.newFile(0, 'test_file', '/fake_path.test', 'html', 'example');
			expect(files.getCurrentFile()).to.not.be.ok;
		});

		it('should return file object after setting a file as current', function(){
			expect(files.getCurrentFile()).to.not.be.ok;

			files.newFile(0, 'test_file', '/fake_path.test', 'html', '');
			files.setCurrentFile(0);

			expect(files.getCurrentFile()).to.be.ok;
			expect(files.getCurrentFile().name).to.equal('test_file')
		});

	});

	describe('#getCurrentHtmlFile()', function(){
		it('should return html file after setting an html file as current even if other file is set', function(){
			expect(files.getCurrentFile()).to.not.be.ok;
			expect(files.getCurrentHtmlFile()).to.not.be.ok;

			files.newFile(0, 'test_file', '/fake_path.test', 'html', '');
			files.setCurrentFile(0);

			expect(files.getCurrentFile()).to.be.ok;
			expect(files.getCurrentHtmlFile()).to.be.ok;
			expect(files.getCurrentHtmlFile().name).to.equal('test_file')

			files.newFile(1, 'non_html', '/fake_path.test', 'css', '');
			files.setCurrentFile(1);

			expect(files.getCurrentFile().name).to.equal('non_html');
			expect(files.getCurrentHtmlFile().name).to.equal('test_file')
		});
	});
});
