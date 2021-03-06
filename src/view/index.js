'use strict';

var inherit = require('../util').inherit,
    Publisher = require('../publisher'),
    Subscriber = require('../subscriber'),
    View = inherit(Publisher, inherit(Subscriber, function View(properties) {

        var self = this,
            ChildView = require('./childView'),
            renderEvent$ = new Bacon.Bus(),
            renderedEl$ = null,
            listenToFunc = null,
            PRE_RENDER = 0,
            RENDER = 1,
            POST_RENDER = 2;

        properties = _.defaults(properties || {}, {
            debug: self.debug || false,
            childDefs: self.childDefs || {},
            ui: self.ui || {},
            template: self.template || '',
            name: self.name || '',
            el: self.el || '',
            initialize: self.initialize || null
        });

        self.render$ = new Bacon.Bus();

        self._template = properties.template;
        self.name = properties.name;
        self.el = properties.el;
        self.$el = $(properties.el);

        self.onPreRender$ = renderEvent$.filter(_isState, PRE_RENDER).map('.data');
        self.onRender$ = renderEvent$.filter(_isState, RENDER).map('.data');
        self.onPostRender$ = renderEvent$.filter(_isState, POST_RENDER).map('.data');

        self.el$ = self.onPreRender$.map($, properties.el, void 0).toProperty();

        self.render$.onValue(function(data) {

            self.$el = $(properties.el);

            renderEvent$.push({state: PRE_RENDER, data: data});

            self.renderTemplate(self._template, data);

            renderEvent$.push({state: RENDER, data: data});
            renderEvent$.push({state: POST_RENDER, data: data});
        });

        renderedEl$ = self.onRender$.map(self.el$);

        self.ui$ = _.mapValues(properties.ui, function(el) {
            var widget = renderedEl$.map(_getEl.bind(self), el).toProperty();
            widget.assign(); // bad workaround...
            return widget;
        });

        self.on$ = _.defaults(self.on$ || {}, {
            preRender: self.onPreRender$,
            render: self.onRender$,
            postRender: self.onPostRender$
        });

        Publisher.call(self, properties, renderedEl$, self.onPreRender$);

        self.children = _.mapValues(properties.childDefs, function(v) {
            if (_.isPlainObject(v)) {
                return new ChildView(self, v);
            } else {
                return v;
            }
        });

        Subscriber.call(self, properties);
        listenToFunc = this.listenTo;
        this.listenTo = function(name, publisher) {
            listenToFunc(name, publisher);
            _.forEach(self.children, function(child) {
                child.listenTo(name, publisher);
            });
        };

        if (properties.initialize) {
            properties.initialize.call(self, self.children, self.on$, self.ui$);
        }

        // bad workaround...
        _.forEach(this.prop$, function(prop$) { prop$.assign(); });
        _.forEach(this.on$, function(on$) { on$.assign(); });
    }));

View.prototype.onPreRender = function onPreRender(f) {
    return this.onPreRender$.onValue(f.bind(this));
};

View.prototype.onRender = function onRender(f) {
    return this.onRender$.onValue(f.bind(this));
};

View.prototype.onPostRender = function onPostRender(f) {
    return this.onPostRender$.onValue(f.bind(this));
};

View.prototype.renderHTML = function renderHTML(html) {
    this.$el.html(html);
};

View.prototype.renderTemplate = function renderTemplate(template, data) {
    this.renderHTML(template(data));
};

View.prototype.render = function render(data) {
    this.render$.push(data);
};

View.prototype.showElement = function showElement($el, isShown) {
    if (_.isString($el)) {
        $el = this.$el.find($el);
    }
    if (isShown) {
        $el.show();
    } else {
        $el.hide();
    }
};

function _isState(state, renderEvent) {
    return renderEvent.state === state;
}

function _getEl($el, root) {
    if (_.isString($el)) {
        return root.find($el);
    } else if(_.isFunction($el)) {
        return $el.call(this, root);
    } else {
        return $el;
    }
}

module.exports = View;
