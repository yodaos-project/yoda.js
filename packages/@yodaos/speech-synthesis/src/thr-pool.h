#pragma once

#include <functional>
#include <mutex>
#include <condition_variable>
#include <thread>
#include <chrono>
#include <list>
#include <vector>

#define TASKTHREAD_FLAG_CREATED 1
#define TASKTHREAD_FLAG_SHOULD_EXIT 2

class ThreadPool {
 private:
  typedef std::function<void()> TaskFunc;

  class TaskThread {
   public:
    TaskThread() {
    }

    TaskThread(const TaskThread&& o) {
    }

    void set_thr_pool(ThreadPool* pool) {
      the_pool = pool;
    }

    void do_task(TaskFunc& func) {
      std::unique_lock<std::mutex> locker(thr_mutex);
      if ((flags & TASKTHREAD_FLAG_CREATED) == 0 &&
          (flags & TASKTHREAD_FLAG_SHOULD_EXIT) == 0) {
        // init
        thr = std::thread([this]() { this->run(); });
        flags |= TASKTHREAD_FLAG_CREATED;
        thr_cond.wait(locker);
      }
      // launch task
      task_func = func;
      thr_cond.notify_one();
    }

    void exit() {
      std::unique_lock<std::mutex> locker(thr_mutex);
      flags |= TASKTHREAD_FLAG_SHOULD_EXIT;
      if (thr.joinable()) {
        thr_cond.notify_one();
        locker.unlock();
        thr.join();
      }
    }

   private:
    void run() {
      std::unique_lock<std::mutex> locker(thr_mutex);
      thr_cond.notify_one();

      while ((flags & TASKTHREAD_FLAG_SHOULD_EXIT) == 0) {
        if (task_func) {
          task_func();
          task_func = the_pool->get_pending_task();
          if (task_func)
            continue;
          else
            the_pool->push_idle_thread(this);
        }
        thr_cond.wait(locker);
      }
    }

   private:
    ThreadPool* the_pool = nullptr;
    std::thread thr;
    std::mutex thr_mutex;
    std::condition_variable thr_cond;
    TaskFunc task_func;
    uint32_t flags = 0;
  };

 public:
  explicit ThreadPool(uint32_t max) {
    thread_array.resize(max);

    uint32_t i;
    for (i = 0; i < max; ++i) {
      thread_array[i].set_thr_pool(this);
    }
    init_idle_threads();
  }

  ~ThreadPool() {
    close();
  }

  void push(TaskFunc& task) {
    std::lock_guard<std::mutex> locker(task_mutex);
    if (idle_threads.empty()) {
      pending_tasks.push_back(task);
    } else {
      idle_threads.front()->do_task(task);
      idle_threads.pop_front();
    }
  }

  void push(TaskFunc&& task) {
    push(task);
  }

  void finish() {
    close();
    init_idle_threads();
  }

  void close() {
    size_t sz = thread_array.size();
    size_t i;
    for (i = 0; i < sz; ++i) {
      thread_array[i].exit();
    }
    std::lock_guard<std::mutex> locker(task_mutex);
    pending_tasks.clear();
    idle_threads.clear();
  }

 private:
  void init_idle_threads() {
    std::lock_guard<std::mutex> locker(task_mutex);
    size_t sz = thread_array.size();
    size_t i;
    for (i = 0; i < sz; ++i) {
      idle_threads.push_back(thread_array.data() + i);
    }
  }

  TaskFunc get_pending_task() {
    std::lock_guard<std::mutex> locker(task_mutex);
    if (pending_tasks.empty())
      return nullptr;
    TaskFunc func = pending_tasks.front();
    pending_tasks.pop_front();
    return func;
  }

  void push_idle_thread(TaskThread* thr) {
    std::lock_guard<std::mutex> locker(task_mutex);
    idle_threads.push_back(thr);
  }

 private:
  std::list<TaskFunc> pending_tasks;
  std::list<TaskThread*> idle_threads;
  std::mutex task_mutex;
  std::vector<TaskThread> thread_array;

  friend TaskThread;
};
