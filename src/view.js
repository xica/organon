'use strict';

var View = function View(app, properties) {

        properties = _.defaults(properties || {}, {
            childDefs: this.childDefs || {},
            template: this.template || '',
            name: this.name || '',
            el: this.el || '',
            presenter: this.presenter || null,
            initialize: this.initialize || null
        });

        this.app = app;

        this.children = _.mapValues(properties.childDefs, function(v) {
            return _.isPlainObject(v) ? v : { view: v };
        });

        this.presenter = properties.presenter;

        this._template = properties.template;
        this.name = properties.name;
        this.el = properties.el;
        this.$el = $(properties.el);

        this.onRender().assign(this, 'renderTemplate', this._template);

        _.forIn(this.children, function(v) {
            this.onPostRender().map(v.map).assign(v.view, 'render');
        }, this);

        if (properties.initialize) {
            properties.initialize.call(this);
        }
    };

View.prototype.onPreRender = function onPreRender(f) {
    return this.app.onPreRenderView(this.name, f);
}

View.prototype.onRender = function onRender(f) {
    return this.app.onRenderView(this.name, f);
}

View.prototype.onPostRender = function onPostRender(f) {
    return this.app.onPostRenderView(this.name, f);
}

View.prototype.renderHTML = function renderHTML(html) {
    $(this.el).html(html);
};

View.prototype.renderTemplate = function renderTemplate(template, data) {
    this.renderHTML(template(data));
};

View.prototype.render = function render(data) {
    this.app.trigger('preRenderView', this.name, data);
    this.app.trigger('renderView', this.name, data);
    this.app.trigger('postRenderView', this.name, data);
};

View.prototype.showElement = function showElement($el, isShown) {
    if (_.isString($el)) {
        $el = $(this.el).find($el);
    }
    if (isShown) {
        $el.show();
    } else {
        $el.hide();
    }
};

module.exports = View;
