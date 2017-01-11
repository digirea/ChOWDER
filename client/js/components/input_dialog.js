/*jslint devel:true*/
(function () {
	"use strict";
	/**
	 * １行の入力ダイアログを表示
	 * @param setting.name ダイアログタイトル
	 * @param setting.initialValue 初期値
	 * @param setting.okButtonName OKボタン表示名
	 */
	function init_text_input(setting, okCallback) {
		var input_dialog,
			input_dialog_name,
			input_dialog_input,
			okbutton,
			background = new PopupBackground(),
			closeFunc;

		/*
		<div id="input_dialog">
			<p style="margin-top:20px;margin-left:20px" id="input_dialog_name"></p>
			<input type="text" id="input_dialog_input" style="margin-left:20px"/>
			<input class="btn" type="button" value="OK" id="input_ok_button" />
		</div>
		*/
		input_dialog = document.createElement('div');
		input_dialog.className = "input_dialog";

		input_dialog_name = document.createElement('p');
		input_dialog_name.style.marginTop = "20px";
		input_dialog_name.style.marginLeft = "20px";
		input_dialog_name.className = "input_dialog_name";
		input_dialog.appendChild(input_dialog_name);

		input_dialog_input = document.createElement("input");
		input_dialog_input.type = "text";
		input_dialog_input.className = "input_dialog_input";
		input_dialog_input.style.marginLeft = "20px";
		input_dialog.appendChild(input_dialog_input);

		okbutton = document.createElement("input");
		okbutton.type = "button";
		okbutton.value = "OK";
		okbutton.className = "btn";
		input_dialog.appendChild(okbutton);
		document.body.appendChild(input_dialog);

		input_dialog_name.textContent = setting.name;
		if (setting.initialValue) {
			input_dialog_input.value = setting.initialValue;
		}

		closeFunc = (function (input_dialog) {
			return function () {
				document.body.removeChild(input_dialog);
			};
		}(input_dialog));

		okbutton.value = setting.okButtonName;
		okbutton.onclick = function (evt) {
			if (okCallback) {
				okCallback(input_dialog_input.value);
			}
			background.close();
			closeFunc();
		};
		background.show();
		background.on('close', closeFunc);
	}

	/**
	 * 色入力ダイアログを表示
	 * @param setting.name ダイアログタイトル
	 * @param setting.initialValue 初期値
	 * @param setting.okButtonName OKボタン表示名
	 */
	function init_color_input(setting, okCallback) {
		var color_dialog,
			dialogname,
			color_picker,
			okbutton,
			background = new PopupBackground(),
			closeFunc;

		/*
		<div id="color_dialog">
			<p style="margin-top:20px;margin-left:20px" id="color_dialog_name"></p>
			<div id="color_dialog_picker"></div>
			<input class="btn" type="button" value="OK" id="color_ok_button" />
		</div>
		*/
		color_dialog = document.createElement('div');
		color_dialog.className = "color_dialog";

		dialogname = document.createElement('p');
		dialogname.style.marginTop = "20px";
		dialogname.style.marginLeft = "20px";
		dialogname.className = "color_dialog_name";
		color_dialog.appendChild(dialogname);

		color_picker = document.createElement('div');
		color_picker.className = "color_dialog_picker";
		color_dialog.appendChild(color_picker);

		okbutton = document.createElement("input");
		okbutton.type = "button";
		okbutton.value = "OK";
		okbutton.className = "btn color_ok_button";
		color_dialog.appendChild(okbutton);
		document.body.appendChild(color_dialog);

		dialogname.textContent = setting.name;

		var colorselector = new ColorSelector(function(colorvalue){}, 234, 120); // 幅、高さ
		color_picker.appendChild(colorselector.elementWrapper);
		if (setting.initialValue) {
			var col = setting.initialValue.split('rgb(').join("");
			col = col.split(")").join("");
			col = col.split(",");
			colorselector.setColor(col[0], col[1], col[2], 1, true);
		}

		closeFunc = (function (color_dialog) {
			return function () {
				document.body.removeChild(color_dialog);
			};
		}(color_dialog));

		okbutton.value = setting.okButtonName;
		okbutton.onclick = function (evt) {
			var colorvalue = colorselector.getColor(),
				colorstr = "rgb(" + colorvalue[0] + "," + colorvalue[1] + "," + colorvalue[2] + ")";
			if (okCallback) {
				okCallback(colorstr);
			}
			background.close();
			closeFunc();
		};

		background.show();
		background.on('close', closeFunc);
	}

	/**
	 * OK Cancel ダイアログを表示
	 * @param setting.name ダイアログタイトル
	 */
	function okcancel_input(setting, callback) {
		var dialog,
			ok_button,
			cancel_button,
			dialog_div,
			background = new PopupBackground(),
			closeFunc;

		/*
		<div id="okcancel_dialog">
			<p style="margin-top:20px;margin-left:20px" id="okcancel_dialog_name"></p>
			<input class="btn" type="button" value="OK" id="okcancel_dialog_ok_button" />
			<input class="btn" type="button" value="Cancel" id="okcancel_dialog_cancel_button" />
		</div>
		*/
		dialog_div = document.createElement('div');
		dialog_div.className = "okcancel_dialog";

		dialog = document.createElement('p');
		dialog.style.marginTop = "20px";
		dialog.style.marginLeft = "20px";
		dialog.className = "okcancel_dialog_name";
		dialog_div.appendChild(dialog);

		ok_button = document.createElement("input");
		ok_button.type = "button";
		ok_button.value = "OK";
		ok_button.className = "btn okcancel_dialog_ok_button";
		dialog_div.appendChild(ok_button);

		cancel_button = document.createElement("input");
		cancel_button.type = "button";
		cancel_button.value = "Cancel";
		cancel_button.className = "btn okcancel_dialog_cancel_button";
		dialog_div.appendChild(cancel_button);
		document.body.appendChild(dialog_div);

		dialog.textContent = setting.name;

		closeFunc = (function (dialog_div) {
			return function () {
				document.body.removeChild(dialog_div);
			};
		}(dialog_div));

		ok_button.onclick = function (evt) {
			if (callback) { callback(true); }
			background.close();
			closeFunc();
		};
		cancel_button.onclick = function (evt) {
			if (callback) { callback(false); }
			background.close();
			closeFunc();
		};

		background.show();
		background.on('close', closeFunc);
	}

	window.input_dialog = {}
	window.input_dialog.text_input = init_text_input;
	window.input_dialog.color_input = init_color_input;
	window.input_dialog.okcancel_input = okcancel_input;
}());