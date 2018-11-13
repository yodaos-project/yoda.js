#include "cli-native.h"

using namespace std;

/**
#include <vector>
#include <utility>
class JMemCheck {
public:
  void add(jerry_value_t value, int32_t id) {
    values.push_back(pair<jerry_value_t, int32_t>(value, id));
  }

  void check() {
    size_t i;
    jerry_value_t v;
    jerry_type_t jtp;
    uint16_t flag;
    for (i = 0; i < values.size(); ++i) {
      v = values[i].first;
      jtp = jerry_value_get_type(v);
      if (jtp == 5 || jtp == 6 || jtp == 7) {
        v &= (~7);
        flag = ((uint16_t*)v)[0];
        flag >>= 6;
        if (flag != 0)
          printf("JMemCheck: id(%d) %p, ref count %d\n", values[i].second, v,
flag);
      }
    }
  }

  void clear() {
    values.clear();
  }

private:
  vector<pair<jerry_value_t, int32_t> > values;
};

static JMemCheck jmem_check;

static bool foreach_func(const jerry_value_t name, const jerry_value_t value,
void* data) { jerry_size_t size = jerry_get_string_size(name); jerry_char_t
str[size + 1]; jerry_string_to_char_buffer(name, str, size); str[size] = '\0';
  jerry_type_t tp = jerry_value_get_type(value);
  printf("foreach: name = %s, value type = %d\n", str, tp);
}
*/

static jerry_value_t caps_to_jobject(iotjs_flora_cli_t* handle,
                                     shared_ptr<Caps>& caps) {
  uint32_t size = caps->size();
  jerry_value_t exports;
  jerry_value_t arr;
  jerry_value_t caps_ctor;
  jerry_value_t jcaps;
  uint32_t idx = 0;
  int32_t iv;
  int64_t lv;
  float fv;
  double dv;
  string sv;
  shared_ptr<Caps> ov;
  jerry_value_t ele;
  jerry_value_t prop;

  // create js object Caps
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, handle);
  exports = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  caps_ctor = iotjs_jval_get_property(exports, "__caps_ctor__");
  jcaps = jerry_construct_object(caps_ctor, nullptr, 0);
  jerry_release_value(caps_ctor);
  // jerry_release_value(exports);
  arr = iotjs_jval_get_property(jcaps, "pairs");

  while (true) {
    int32_t type = caps->next_type();
    if (type == CAPS_ERR_EOO)
      break;
    ele = jerry_create_object();
    prop = jerry_create_number(type);
    iotjs_jval_set_property_jval(ele, "type", prop);
    jerry_release_value(prop);
    switch (type) {
      case 'i':
        caps->read(iv);
        prop = jerry_create_number(iv);
        iotjs_jval_set_property_jval(ele, "value", prop);
        jerry_release_value(prop);
        break;
      case 'l':
        caps->read(lv);
        prop = jerry_create_number(lv);
        iotjs_jval_set_property_jval(ele, "value", prop);
        jerry_release_value(prop);
        break;
      case 'f':
        caps->read(fv);
        prop = jerry_create_number(fv);
        iotjs_jval_set_property_jval(ele, "value", prop);
        jerry_release_value(prop);
        break;
      case 'd':
        caps->read(dv);
        prop = jerry_create_number(dv);
        iotjs_jval_set_property_jval(ele, "value", prop);
        jerry_release_value(prop);
        break;
      case 'S':
        caps->read_string(sv);
        prop = jerry_create_string_from_utf8(
            reinterpret_cast<const jerry_char_t*>(sv.c_str()));
        iotjs_jval_set_property_jval(ele, "value", prop);
        jerry_release_value(prop);
        break;
      case 'B': {
        jerry_value_t buf;

        caps->read_binary(sv);
        prop = jerry_create_typedarray(JERRY_TYPEDARRAY_UINT8, sv.length());
        buf = jerry_get_typedarray_buffer(prop, nullptr, nullptr);
        jerry_arraybuffer_write(buf, 0, (const uint8_t*)sv.data(), sv.length());
        jerry_release_value(buf);
        iotjs_jval_set_property_jval(ele, "value", prop);
        jerry_release_value(prop);
        break;
      }
      case 'O':
        caps->read(ov);
        prop = caps_to_jobject(handle, ov);
        iotjs_jval_set_property_jval(ele, "value", prop);
        jerry_release_value(prop);
        break;
    }
    jerry_set_property_by_index(arr, idx, ele);
    jerry_release_value(ele);
    ++idx;
  }
  jerry_release_value(arr);
  return jcaps;
}

static shared_ptr<Caps> jobject_to_caps(jerry_value_t jcaps) {
  jerry_value_t arr = iotjs_jval_get_property(jcaps, "pairs");
  uint32_t len = jerry_get_array_length(arr);
  uint32_t i;
  shared_ptr<Caps> caps = Caps::new_instance();
  jerry_value_t ele;
  jerry_value_t prop;

  for (i = 0; i < len; ++i) {
    ele = jerry_get_property_by_index(arr, i);
    prop = iotjs_jval_get_property(ele, "type");
    int32_t type = (int32_t)jerry_get_number_value(prop);
    jerry_release_value(prop);
    prop = iotjs_jval_get_property(ele, "value");
    switch (type) {
      case 'i':
        caps->write((int32_t)jerry_get_number_value(prop));
        break;
      case 'l':
        caps->write((int64_t)jerry_get_number_value(prop));
        break;
      case 'f':
        caps->write((float)jerry_get_number_value(prop));
        break;
      case 'd':
        caps->write(jerry_get_number_value(prop));
        break;
      case 'S': {
        jerry_size_t size = jerry_get_string_size(prop);
        jerry_char_t strbuf[size + 1];
        jerry_string_to_char_buffer(prop, strbuf, size);
        strbuf[size] = '\0';
        caps->write((char*)strbuf);
        break;
      }
      case 'B':
        // TODO: caps write binary
        break;
      case 'O': {
        shared_ptr<Caps> sub = jobject_to_caps(prop);
        caps->write(sub);
        break;
      }
    }
    jerry_release_value(prop);
    jerry_release_value(ele);
  }
  jerry_release_value(arr);
  return caps;
}

class NativeCallback : public flora::ClientCallback {
 public:
  // cppcheck-suppress unusedFunction
  void recv_post(const char* name, uint32_t msgtype, shared_ptr<Caps>& msg) {
    IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
    list<AsyncCallbackInfo>::iterator it;

    _this->stl_st->cb_mutex.lock();
    it = _this->stl_st->pending_callbacks.emplace(
        _this->stl_st->pending_callbacks.end());
    (*it).cb_type = 0;
    (*it).name = name;
    (*it).msgtype = msgtype;
    (*it).msg = msg;
    _this->stl_st->cb_mutex.unlock();
    uv_async_send(&_this->async);
  }

  // cppcheck-suppress unusedFunction
  void disconnected() {
    IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
    list<AsyncCallbackInfo>::iterator it;

    _this->stl_st->cb_mutex.lock();
    it = _this->stl_st->pending_callbacks.emplace(
        _this->stl_st->pending_callbacks.end());
    (*it).cb_type = 1;
    _this->stl_st->cb_mutex.unlock();
    uv_async_send(&_this->async);
  }

  static void async_callback(uv_async_t* handle) {
    NativeCallback* _this = static_cast<NativeCallback*>(handle->data);
    _this->handle_callback();
  }

 private:
  void handle_callback() {
    // TODO: 可能此时iotjs_flora_cli_t已经释放，如何避免？
    IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
    list<AsyncCallbackInfo> infos;
    _this->stl_st->cb_mutex.lock();
    infos.splice(infos.begin(), _this->stl_st->pending_callbacks);
    _this->stl_st->cb_mutex.unlock();

    list<AsyncCallbackInfo>::iterator it;
    while (!infos.empty()) {
      it = infos.begin();
      switch ((*it).cb_type) {
        case 0:
          js_call_recv_post((*it).name, (*it).msgtype, (*it).msg);
          break;
        case 1:
          js_call_disconnected();
          break;
      }
      infos.pop_front();
    }
  }

  void js_call_recv_post(const string& name, uint32_t msgtype,
                         shared_ptr<Caps>& msg) {
    IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
    jerry_value_t this_obj = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
    jerry_value_t cb_func =
        iotjs_jval_get_property(this_obj, "native_callback");
    iotjs_jargs_t jargs = iotjs_jargs_create(2);
    jerry_value_t type = jerry_create_number(0);
    jerry_value_t args = jerry_create_array(3);
    iotjs_jargs_append_jval(&jargs, type);
    iotjs_jargs_append_jval(&jargs, args);
    jerry_value_t ele;
    ele = jerry_create_string_from_utf8((const jerry_char_t*)name.c_str());
    jerry_set_property_by_index(args, 0, ele);
    jerry_release_value(ele);
    ele = jerry_create_number(msgtype);
    jerry_set_property_by_index(args, 1, ele);
    jerry_release_value(ele);
    ele = caps_to_jobject(thisptr, msg);
    jerry_set_property_by_index(args, 2, ele);
    jerry_release_value(ele);
    iotjs_make_callback(cb_func, this_obj, &jargs);
    jerry_release_value(type);
    jerry_release_value(args);
    iotjs_jargs_destroy(&jargs);
    jerry_release_value(cb_func);
    // jerry_release_value(this_obj);
  }

  void js_call_disconnected() {
    IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
    jerry_value_t this_obj = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
    jerry_value_t cb_func =
        iotjs_jval_get_property(this_obj, "native_callback");
    iotjs_jargs_t jargs = iotjs_jargs_create(1);
    iotjs_jargs_append_number(&jargs, 1);
    iotjs_make_callback(cb_func, this_obj, &jargs);
    iotjs_jargs_destroy(&jargs);
    jerry_release_value(cb_func);
    // jerry_release_value(this_obj);
  }

 public:
  iotjs_flora_cli_t* thisptr = nullptr;
};

static void iotjs_flora_cli_destroy(iotjs_flora_cli_t* inst) {
  IOTJS_VALIDATED_STRUCT_DESTRUCTOR(iotjs_flora_cli_t, inst);
  delete _this->callback;
  iotjs_jobjectwrap_destroy(&_this->jobjectwrap);
  delete _this->stl_st;
  IOTJS_RELEASE(inst);
}

static JNativeInfoType this_module_native_info = {
  .free_cb = (jerry_object_native_free_callback_t)iotjs_flora_cli_destroy
};

static iotjs_flora_cli_t* iotjs_flora_cli_create(jerry_value_t jcli) {
  iotjs_flora_cli_t* fcli = IOTJS_ALLOC(iotjs_flora_cli_t);
  IOTJS_VALIDATED_STRUCT_CONSTRUCTOR(iotjs_flora_cli_t, fcli);
  _this->stl_st = new flora_cli_stl;
  jcli = jerry_acquire_value(jcli);

  iotjs_jobjectwrap_initialize(&_this->jobjectwrap, jcli,
                               &this_module_native_info);
  return fcli;
}

// string uri
// int msgsize
JS_FUNCTION(Connect) {
  if (jargc < 3) {
    return JS_CREATE_ERROR(
        COMMON, "arguments: string uri, int msgsize, Client instance");
  }
  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t strbuf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], strbuf, size);
  strbuf[size] = '\0';
  shared_ptr<flora::Client> cli;
  uint32_t msg_bufsize = (uint32_t)JS_GET_ARG(1, number);
  NativeCallback* cb = new NativeCallback();
  int32_t r = flora::Client::connect((char*)strbuf, cb, msg_bufsize, cli);
  if (r != FLORA_CLI_SUCCESS) {
    delete cb;
    return jerry_create_number(r);
  }
  jerry_value_t cli_proto;
  cli_proto = iotjs_jval_get_property(jthis, "client_prototype");
  jerry_value_t jcli = jargv[2];
  jerry_value_t proto1 = jerry_get_prototype(jcli);
  jerry_set_prototype(proto1, cli_proto);
  // debug版本jerry assert失败
  // 为什么不能release?
  // jerry_release_value(proto1);
  iotjs_flora_cli_t* inst = iotjs_flora_cli_create(jcli);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, inst);
  uv_async_init(uv_default_loop(), &_this->async,
                NativeCallback::async_callback);
  _this->async.data = cb;
  _this->stl_st->cli = cli;
  _this->callback = cb;
  cb->thisptr = inst;
  jerry_release_value(cli_proto);
  return jerry_create_number(r);
}

JS_FUNCTION(Subscribe) {
  if (jargc < 1) {
    return JS_CREATE_ERROR(COMMON, "arguments: string name");
  }
  JS_DECLARE_THIS_PTR(flora_cli, thisptr);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
  if (_this->stl_st->cli.get() == nullptr) {
    return jerry_create_number(FLORA_CLI_ECONN);
  }

  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t strbuf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], strbuf, size);
  strbuf[size] = '\0';
  int32_t r = _this->stl_st->cli->subscribe((char*)strbuf);
  return jerry_create_number(r);
}

JS_FUNCTION(Unsubscribe) {
  if (jargc < 1) {
    return JS_CREATE_ERROR(COMMON, "arguments: string name");
  }
  JS_DECLARE_THIS_PTR(flora_cli, thisptr);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
  if (_this->stl_st->cli.get() == nullptr) {
    return jerry_create_number(FLORA_CLI_ECONN);
  }

  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t strbuf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], strbuf, size);
  strbuf[size] = '\0';
  int32_t r = _this->stl_st->cli->unsubscribe((char*)strbuf);
  return jerry_create_number(r);
}

JS_FUNCTION(Post) {
  if (jargc < 3) {
    return JS_CREATE_ERROR(
        COMMON, "arguments: string name, array msgcontent, int type");
  }
  JS_DECLARE_THIS_PTR(flora_cli, thisptr);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
  if (_this->stl_st->cli.get() == nullptr) {
    return jerry_create_number(FLORA_CLI_ECONN);
  }
  jerry_size_t size = jerry_get_utf8_string_size(jargv[0]);
  jerry_char_t namebuf[size + 1];
  jerry_string_to_utf8_char_buffer(jargv[0], namebuf, size);
  namebuf[size] = '\0';
  shared_ptr<Caps> caps = jobject_to_caps(jargv[1]);
  int32_t msgtype = (int32_t)JS_GET_ARG(2, number);
  int32_t r = _this->stl_st->cli->post((char*)namebuf, caps, msgtype);
  return jerry_create_number(r);
}

static void flora_safe_close(uv_handle_t* handle) {
  NativeCallback* cb = reinterpret_cast<NativeCallback*>(
      reinterpret_cast<uv_async_t*>(handle)->data);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, cb->thisptr);
  jerry_value_t this_obj = iotjs_jobjectwrap_jobject(&_this->jobjectwrap);
  jerry_release_value(this_obj);
}

JS_FUNCTION(Close) {
  // TODO: implement Close
  // release jerry_value_t in callback of uv_async_close
  JS_DECLARE_THIS_PTR(flora_cli, thisptr);
  IOTJS_VALIDATED_STRUCT_METHOD(iotjs_flora_cli_t, thisptr);
  _this->stl_st->cli.reset();
  uv_close((uv_handle_t*)&_this->async, flora_safe_close);
}

void init_cli(jerry_value_t exports) {
  iotjs_jval_set_method(exports, "connect", Connect);

  jerry_value_t cli_proto = jerry_create_object();
  iotjs_jval_set_method(cli_proto, "subscribe", Subscribe);
  iotjs_jval_set_method(cli_proto, "unsubscribe", Unsubscribe);
  iotjs_jval_set_method(cli_proto, "post", Post);
  iotjs_jval_set_method(cli_proto, "close", Close);
  iotjs_jval_set_property_jval(exports, "client_prototype", cli_proto);
  jerry_release_value(cli_proto);
}

NODE_MODULE(flora_cli, init_cli)
