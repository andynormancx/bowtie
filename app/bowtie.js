/* this is bowtie. */
(function() {

	var bowtie = function() {

		var self = this,
			expressionRewriter,
			inspectorElement,
			inspectorHeight = 200,
			currentElement;

		self.importJq = function(complete) {

			// check if we have jquery on the page.
			if (typeof window.jQuery === 'undefined' || window.jQuery.fn.jquery < '1.3.0') {

				var script = document.createElement('script');
				var loaded = false;

				// get ready to import jQuery
				script.setAttribute('src', 'https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js');
				script.onload = script.onreadystatechange = function() {

					if (!loaded && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {

						loaded = true;
						complete();

					}

				};

				// let's do this
				document.getElementsByTagName('head')[0].appendChild(script);

			} else { 

				complete();

			}

		};

		self.isComplexBinding = function(bindingText) {

			return self.stringTrim(bindingText).substring(0, 1) === '{';

		}

		self.generatePropertyTable = function(bindingText, element) {

			var parsedBindings = self.parseObjectLiteral(bindingText),
				el = element[0],
				table = $('<table />'),
				cellStr = '<td/>';

			$.each(parsedBindings, function(index, binding) {

				var row, keyCell, valueCell, watchCell;

				// create the row
				row = $('<tr/>');

				if (self.isComplexBinding(binding.value)) {

					// create the key name cell
					$(cellStr)
						.addClass('key')
						.text(binding.key)
						.appendTo(row);

					$(cellStr)
						.append(self.generatePropertyTable(binding.value, element))
						.attr('colspan', 2)
						.appendTo(row);

				} else {

					// create the key name cell
					$(cellStr)
						.addClass('key')
						.text(binding.key)
						.appendTo(row);

					$(cellStr)
						.text(binding.value)
						.appendTo(row);

					$(cellStr)
						.addClass('watch-cell')
						.append(
							$('<a/>')
								.attr('href', 'javascript: void();')
								.bind('click', function() { self.addWatch(el, binding); })
								.text('watch')
						)
						.appendTo(row);

				}

				// no border on the first row!
				if (index === 0) {

					row.addClass('first-row')

				}

				// add the row to the table
				table.append(row);

			});

			return table;
		};

		self.validateWatchText = function(element, binding) {

			try
			{
				self.getWatchObservable('test: ' + binding, ko.contextFor(element));
			}
			catch(err)
			{
				return false;
			}

			return true;
		};

		self.inspect = function(element) {

			var quickInspectWindow = $('.bowtie-inspector .bowtie-quick-inspect-panel'),
				bindingText = element.attr('data-bind');

			// clear the quick inspect window, then add our binding table to it.
			quickInspectWindow.empty()
				.append(self.generatePropertyTable(bindingText, element));

			quickInspectWindow.append(
				$('<div/>').append(
					$('<a href="javascript:void();"/>').text('add arbitrary watch in this element\'s binding context')
						.click(function() {

							var bindingText, binding;

							// get binding text from the user
							bindingText = prompt('enter the expression to watch in the context of ' + element[0].nodeName);

							// convert it into a binding object
							binding = { key: bindingText, value: bindingText };

							// try and get the watch observable
							if(!self.validateWatchText(element[0], binding)) {

								alert(bindingText + ' is not a valid watch statement!')

								return;
							}

							// add a watch on this observable
							self.addWatch(element[0], binding);
						})
				).append(
					$('<br/><a href="javascript:void();"/>').text('hover to view context $data')
						.bind('mouseover.bowtie', function(event) {

							var inspector, target = $(event.target);

							// create an object inspector
							var inspector = $('<div/>')
								.addClass('bowtie-object-inspector')
								.append(self.generateObjectTable(ko.contextFor(element[0]).$data))
								.appendTo('body')
								.fadeIn(200);

							target.bind('mouseout.bowtie', function() {

								target.unbind('mouseout.bowtie');
								inspector.fadeOut(200, function() { inspector.remove(); })

							});

						})
					)
				);

				if (ko.contextFor(element[0]).$parents.length > 0) {

					quickInspectWindow.children('div').append('<span>&nbsp;|&nbsp;</span>').append(
						$('<a href="javascript:void();"/>').text('hover to view context $parent')
							.bind('mouseover.bowtie', function(event) {

								var inspector, target = $(event.target);

								// create an object inspector
								var inspector = $('<div/>')
									.addClass('bowtie-object-inspector')
									.append(self.generateObjectTable(ko.contextFor(element[0]).$parent))
									.appendTo('body')
									.fadeIn(200);

								target.bind('mouseout.bowtie', function() {

									target.unbind('mouseout.bowtie');
									inspector.fadeOut(200, function() { inspector.remove(); })

								});

							})
						);
				}

			currentElement = element;

		};

		self.getWatchObservable = function(binding, context) {

			return ko.bindingProvider.instance.parseBindingsString('{ binding: ' + binding.value + '}', context).binding;

		};

		self.generateObjectTable = function(source) {

			var property, propVal, table = $('<table/>');

			for (property in source) {

				(function() {

					var row = $('<tr />').appendTo(table);

					if (source.hasOwnProperty(property)) {

						$('<td />')
							.text(property)
							.addClass('key')
							.appendTo(row);

						// get the value of the property
						propVal = source[property];

						// add the value field
						$('<td />')
							.append(self.getWatchValueForDisplay(propVal))
							.appendTo(row);

					}

				})();

			}

			return table;

		};

		self.getWatchValueForDisplay = function(observable) {

			var value = ko.isObservable(observable) ? observable() : observable,
				table, arrayValue = '', returnElement;

			// turn arrays all pretty.
			if (Object.prototype.toString.call(value) === '[object Array]')
			{
				arrayValue = $('<div />');

				$.each(value, function(index, item) { 

					if (typeof item === 'object') {

						arrayValue.append(
							$('<span>').text(index === 0 ? '' : ', ')
								.append(
									$('<a />').attr('href', 'javascript:void(0);')
										.addClass('object-reference')
										.text('{ object }')
										.bind('mouseover.bowtie', function(event) {

											var inspector, target = $(event.target);

											// create an object inspector
											var inspector = $('<div/>')
												.addClass('bowtie-object-inspector')
												.append(self.generateObjectTable(item))
												.appendTo('body')
												.fadeIn(200);

											target.bind('mouseout.bowtie', function() {

												target.unbind('mouseout.bowtie');
												inspector.fadeOut(200, function() { inspector.remove(); })

											});

										})
									)
							);

						return;
					}

					arrayValue.append(
						$('<span />').text((index === 0 ? '' : ', ') + item)
					);
				});

				returnElement = arrayValue.prepend($('<span>').text('[ ')).append($('<span>').text(' ]'));
			}

			// turn objects all pretty.
			else if (typeof value === 'object') {

				returnElement = self.generateObjectTable(value);

			}

			else {

				// otherwise just make it a span
				returnElement = $('<span>' + value + '</span>');

			}

			// return it
			return returnElement;

		};

		// todo: this needs to crawl more than one level up
		self.getRelatedObservable = function(binding, observable, context) {

			var parentContext = context.$parent, i;

			for (property in parentContext) {

				if (parentContext.hasOwnProperty(property) && ko.isObservable(parentContext[property])) {

					if (parentContext[property]() === context.$data) {

						// create a dependent observable that returns the new value of this child item, but updates when its parent changes.
						return ko.dependentObservable(function() {

							var parent = parentContext[property]();

							return parentContext[property]()[self.stringTrim(binding.value)];

						});

					}

				}

			}
			
			// todo: polling method

		};

		self.addWatch = function(element, binding) {

			var watchPanel = $('.bowtie-inspector .bowtie-watch-panel'),
				watchTable = watchPanel.children('table'),
				bindingContext, watchObservable, originalWatchObservable, valueCell, removeCell, valueIsObservable, subscribeObservable;

			bindingContext = ko.contextFor(element); 
			watchObservable = self.getWatchObservable(binding, bindingContext);
			valueIsObservable = ko.isObservable(watchObservable);

			if (!valueIsObservable) {

				watchObservable = new ko.dependentObservable(function() {

					return self.getWatchObservable(binding, bindingContext);

				});

			}

			// Use evaluatedBindings if given, otherwise fall back on asking the bindings provider to give us some bindings
            var row = $('<tr/>')
            	.appendTo(watchTable)
            	.append(
            		$('<td/>')
            			.addClass('key')
            			.text(element.nodeName + '->' + binding.key)
            	)
            	.append(
					valueCell = $('<td/>')
            			.append(self.getWatchValueForDisplay(watchObservable))
            	)
            	.append(
            		removeCell = $('<td/>')
            			.addClass('watch-cell')
            			.append($('<a/>').attr('href', 'javascript: void();').text('remove'))
            	);

			// remove the cell
            $('a', removeCell).click(function() {

            	row.remove();

            });

            // if the value we were inspecting was not an observable itself, see if it has dependencies. if it has dependencies, it'll probably still update correctly.
            subscribeObservable = watchObservable;

            if (!valueIsObservable) {

            	if (watchObservable.getDependenciesCount() === 0) {

            		// if not, we're going to have to put together an observable that creates a dependency on the value's observable parent.
            		// chances are good this is a non-observable value.
            		subscribeObservable = self.getRelatedObservable(binding, watchObservable, bindingContext);

            	}
            }

            // subscribe the value observable
            subscribeObservable.subscribe(function(value) {

            	valueCell.empty()
            		.append(self.getWatchValueForDisplay(subscribeObservable));

            })
		};

		self.elementMouseover = function(event) {

			var el = $(event.target),
				icon = $('<div/>').addClass('bowtie-inspect-icon'),
				body = $('body'),
				iconL = el.offset().left,
				iconT = el.offset().top;

			// position the icon
			icon.css({ top: iconT, left: iconL });

			// add a click event to the watch icon
			icon.bind('click', function() {

				self.inspect(el);

			});

			// hide all other icons
			$('.bowtie-inspect-icon').fadeOut(200, function() { $(this).remove(); })

			// append it to the body
			body.append(icon);

			// attach an event handler to remove the tooltip
			el.bind('mouseout.bowtie', function() {

				el.unbind('mouseout.bowtie');

				setTimeout(function() {
					icon.fadeOut(200, function() {  icon.remove(); });
				}, 1000);

			});

			// fade in the tooltip
			icon.fadeIn(200);

		};

		self.hookElements = function() {

			// attach a mouseover event to all elements, then mark them as hooked.
			$('[data-bind]:not([data-bowtie-hook])')
				.bind('mouseover.bowtie', self.elementMouseover)
				.attr('data-bowtie-hook', true);

		};

		self.beginPolling = function() {

			// hook existing knockout elements
			self.hookElements();

			// start polling for elements that are knockoutty.
			setInterval(function() {

				self.hookElements();

			}, 3000);

		};

		self.hookKnockout = function() {

			if (window.ko === undefined || window.ko.utils === undefined) {
				return false;
			}

			expressionRewriter = ko.jsonExpressionRewriting;

			return true;

		};

		self.createInspectorWindow = function() {

			var inspector = $('<div/>'),
				spacer = $('<div/>'),
				watchPanel;

			// first, set up the inspector.
			inspector.addClass('bowtie-inspector')
				.append($());

			// add a title bar to the inspector
			$('<div/>').addClass('title-bar')
				.text('bowtie binding inspector')
				.appendTo(inspector);

			// add the quick inspect window
			$('<div/>').addClass('bowtie-quick-inspect-panel panel')
				.appendTo(inspector);

			// add the quick inspect window
			watchPanel = $('<div/>').addClass('bowtie-watch-panel panel')
				.append($('<table></table>'))
				.appendTo(inspector);

			// add the inspector to the body.
			$('body').append(inspector);

			// place and size the spacer
			spacer.css('height', inspectorHeight)
				.appendTo('body');

			// animate in the inspector.
			inspector.animate({ height: inspectorHeight }, 300);

			// save the inspector
			inspectorElement = inspector;
		};

		self.run = function() {

			if (!self.hookKnockout()) {

				alert('This page does not use knockout! Bowtie can only work on a page that uses knockout.');
				return;

			}

			// import jquery, if we need it.
			self.importJq(self.beginPolling);

			// create the inspector window
			self.createInspectorWindow();

		};

		self.parseObjectLiteral = function (literalString) {

			return expressionRewriter.parseObjectLiteral(literalString);

		};

		self.stringTrim = function (string) {
            return (string || "").replace(/^(\s|\u00A0)+|(\s|\u00A0)+$/g, "");
        };

	};

	// bowtie's already initialized
	if (window.bowtieapp !== undefined) {
		return;
	}

	// set up bowtie.
	window.bowtieapp = new bowtie();

	if (/in/.test(document.readyState)) {

		window.addEventListener('load', function() { bowtieapp.run(); }, false);

	} else {

		bowtieapp.run();

	}

}());