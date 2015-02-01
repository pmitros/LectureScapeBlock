"""TO-DO: Write a description of what this XBlock is."""

import pkg_resources

from xblock.core import XBlock
from xblock.fields import Scope, Integer
from xblock.fragment import Fragment


class LSXBlock(XBlock):
    """
    TO-DO: document what your XBlock does.
    """

    # Fields are defined on the class.  You can access them in your code as
    # self.<fieldname>.

    # TO-DO: delete count, and define your own fields.
    count = Integer(
        default=0, scope=Scope.user_state,
        help="A simple counter, to show something happening",
    )

    def resource_string(self, path):
        """Handy helper for getting resources from our kit."""
        data = pkg_resources.resource_string(__name__, path)
        return data.decode("utf8")

    # TO-DO: change this view to display your data your own way.
    def student_view(self, context=None):
        """
        The primary view of the LSXBlock, shown to students
        when viewing courses.
        """
        html = self.resource_string("app/templates/app/player.html")
        frag = Fragment(html.format(self=self))
        frag.add_css(self.resource_string("app/static/app/css/jquery.jscrollpane.css"))
        frag.add_css(self.resource_string("app/static/app/myplayer/style.css"))
        frag.add_css(self.resource_string("app/static/app/css/common.css"))
        frag.add_javascript(self.resource_string("app/static/app/js/jquery-1.10.2.min.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/d3.v3.min.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/d3.layout.cloud.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/jscrollpane/jquery.mousewheel.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/jscrollpane/jquery.jscrollpane.min.js"))
        frag.add_javascript(self.resource_string("app/static/app/js/common.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Player.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Peak.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Timeline.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Highlight.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/PersonalTrace.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Transcript.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Topicflow.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/Log.js"))
        frag.add_javascript(self.resource_string("app/static/app/myplayer/script.js"))
        frag.initialize_js('LSXBlock')
        return frag

    # TO-DO: change this handler to perform your own actions.  You may need more
    # than one handler, or you may not need any handlers at all.
    @XBlock.json_handler
    def increment_count(self, data, suffix=''):
        """
        An example handler, which increments the data.
        """
        # Just to show data coming in...
        assert data['hello'] == 'world'

        self.count += 1
        return {"count": self.count}

    # TO-DO: change this to create the scenarios you'd like to see in the
    # workbench while developing your XBlock.
    @staticmethod
    def workbench_scenarios():
        """A canned scenario for display in the workbench."""
        return [
            ("LSXBlock",
             """<vertical_demo>
                <lecturescape/>
                </vertical_demo>
             """),
        ]