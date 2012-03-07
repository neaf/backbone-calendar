function extractDate(date) {
	var day = date.getDate();
	var month = date.getMonth();
	var year = date.getFullYear();
	return new Date(year, month, day);
}

function earlierDate(date1, date2) {
    if (date1 < date2) {
        return date1;
    } else {
        return date2;
    }
}

function laterDate(date1, date2) {
    if (date1 > date2) {
        return date1;
    } else {
        return date2;
    }
}

$(function() {
	window.Event = Backbone.Model.extend({
		startDate: function() {
			if (this.attributes.startDate) {
				return extractDate(this.attributes.startDate);
			}
		},
		endDate: function() {
			if (this.attributes.endDate) {
				return extractDate(this.attributes.endDate);
			}
		},
		happensOn: function(date) {
			date = extractDate(date);
			return this.startDate() <= date && date <= this.endDate();
		},
        collidesWith: function(event) {
            var e1 = this;
            var e2 = event;
            return e1.get('startDate') < e2.get('endDate') &&
                e1.get('endDate') > e2.get('startDate');
        },
        sortKey: function() {
            return [this.get('startDate'), this.length()];
        },
        length: function() {
            return this.get('endDate') - this.get('startDate');
        }
	});

	window.EventList = Backbone.Collection.extend({
		model: Event
	});

	window.Day = Backbone.Model.extend({
		dateDisplay: function() {
			var day = this.attributes.date.getDate();
			var month = this.attributes.date.getMonth() + 1;
			var year = this.attributes.date.getFullYear();
			return [day, month, year].join('/');
		},
		viewParams: function() {
			return {
				'date': this.dateDisplay()
			}
		},
		events: function() {
			return Events.filter(function(event) {
				return event.happensOn(this.attributes.date);
			}, this);
		}
	});

	window.DayList = Backbone.Collection.extend({
		model: Day
	});

    window.EventView = Backbone.View.extend({
        initialize: function() {
            this.indent = 0;
            this.model.bind('change', this.render, this);
            this.model.bind('remove', this.remove, this);
        },
        tagName: 'li',
        attributes: {
            'class': 'event'
        },
        template: Handlebars.templates.event,
        render: function() {
            var content = this.template(this.model.toJSON());
            this.$el.html(content);
            this.position();
            return this;
        },
        remove: function() {
            this.$el.remove();
        },
        position: function() {
            var hourHeight = (100/24);
            var date = this.options.date;
            var start = laterDate(this.model.attributes.startDate, date);
            var endDate = new Date(date);
            endDate.setDate(date.getDate() + 1);
            var end = earlierDate(this.model.attributes.endDate, endDate);
            this.$el.css({
                'top': hourHeight * start.getHours() + '%',
                'height': (end.getTime() - start.getTime()) / 3600000 * hourHeight + '%'
            });
        },
        collidesWith: function(view) {
            return this.model.collidesWith(view.model);
        },
        indentUsing: function(view) {
            this.indent = view.indent + 1;
        }
    });

	window.DayView = Backbone.View.extend({
		tagName: 'li',
		attributes: {
			'class': 'day'
		},
        initialize: function() {
            this.eventViews = [];
        },
		template: Handlebars.templates.day,
		render: function() {
			var content = this.template(this.model.viewParams());
			this.$el.html(content);
            return this;
        },
        addEvents: function() {
            _.each(this.model.events(), this.addEvent, this);
        },
        addEvent: function(event) {
            var view = new EventView({ model: event, date: this.model.attributes.date });
            this.eventsContainer().append(view.render().el);
            this.eventViews.push(view);
            this.sortEventViews();
            return view;
        },
        eventsContainer: function() {
            return this.$('.events');
        },
        sortEventViews: function() {
            this.eventViews = _.sortBy(this.eventViews, function(e) {
                return e.model.sortKey();
            });
        },
        reindentEvents: function() {
            var maxIndent = 0;
            var views = this.eventViews;
            _.each(views, function(current, i) {
                var remaining = views.slice(i + 1);
                var colliding = _.filter(remaining, current.collidesWith, current);
                _.each(colliding, function(other) {
                    other.indentUsing(current);
                    maxIndent = Math.max(maxIndent, other.indent);
                });
            });
            _.each(views, function(v) {
                v.$el.css('left', v.indent * 100 / (maxIndent + 1) + '%');
                v.$el.css('width', 100 / (maxIndent + 1) + '%');
            });
        }
	});

	window.Calendar = Backbone.View.extend({
		el: $('#calendar'),
		initialize: function() {
			this.daysContainer = this.$('.days');
			this.dayViews = [];
		},
        addDay: function(day) {
            var view = new DayView({ model: day });
            view.render();
            view.addEvents();
            this.daysContainer.append(view.el);
            this.dayViews.push(view);
        },
        addEvent: function(event) {
            var views = this.dayViewsForEvent(event);
            var eventViews = [];
            _.each(views, function(view) {
                var eventView = view.addEvent(event);
                eventViews.push(eventView);
                view.reindentEvents();
            });
        },
        dayViewsForEvent: function(event) {
            return _.filter(this.dayViews, function(view) {
                return event.happensOn(view.model.attributes.date);
            });
        }
    });

	// Init
	window.Events = new EventList;
	window.Days = new DayList;
	window.App = new Calendar;

    Days.bind('add', App.addDay, App);
    Events.bind('add', App.addEvent, App);

	var startDate = new Date(2012, 2, 13);
	var dayCount = 3;
	var date = new Date(startDate);
	_.times(dayCount, function() {
		Days.add({ 'date': new Date(date) });
		date.setDate(date.getDate() + 1);
	}, this);

	_.each(eventsData, function(params) {
		Events.add(params);
	});
});
